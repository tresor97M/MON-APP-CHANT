/**
 * WebRTC Call Manager — Maestro Studio
 *
 * Handles real peer-to-peer audio/video calls using:
 * - WebRTC for media streams (RTCPeerConnection)
 * - Supabase Realtime Broadcast for signaling (offer/answer/ICE/hangup)
 *
 * Signaling flow:
 *   Caller                          Callee
 *   ------                          ------
 *   createOffer()                   (subscribed to incoming channel)
 *   → sends 'call-offer' via        ← receives 'call-offer'
 *     channel `calls:{calleeId}`    
 *                                   acceptCall() → sends 'call-answer'
 *   ← receives 'call-answer'
 *   addAnswer()
 *
 *   Both sides exchange ICE candidates via 'ice-candidate' broadcasts
 */

import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export type CallType = 'audio' | 'video';
export type CallDirection = 'outgoing' | 'incoming';

export interface IncomingCallInfo {
  callerId: string;
  callerName: string;
  callerAvatar: string;
  callType: CallType;
  offer: RTCSessionDescriptionInit;
}

export interface CallManagerOptions {
  localUserId: string;
  localUserName: string;
  localUserAvatar: string;
  onIncomingCall: (info: IncomingCallInfo) => void;
  onCallConnected: () => void;
  onCallEnded: () => void;
  onRemoteStream: (stream: MediaStream) => void;
  onError: (err: Error) => void;
}

// Public Google STUN servers (work for ~80% of network configurations)
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export class WebRTCCallManager {
  private opts: CallManagerOptions;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private inboundChannel: RealtimeChannel | null = null;
  private outboundChannel: RealtimeChannel | null = null;
  private currentCalleeId: string | null = null;
  private currentCallType: CallType = 'audio';

  constructor(opts: CallManagerOptions) {
    this.opts = opts;
  }

  /**
   * Subscribe to incoming calls.
   * Must be called once when the user logs in.
   */
  subscribeToIncomingCalls() {
    const channelName = `calls:${this.opts.localUserId}`;
    this.inboundChannel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'call-offer' }, async ({ payload }) => {
        const { callerId, callerName, callerAvatar, callType, offer } = payload;
        this.opts.onIncomingCall({
          callerId,
          callerName,
          callerAvatar,
          callType,
          offer,
        });
      })
      .on('broadcast', { event: 'call-answer' }, async ({ payload }) => {
        if (this.pc && payload.answer) {
          try {
            await this.pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            this.opts.onCallConnected();
          } catch (err) {
            this.opts.onError(err as Error);
          }
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (this.pc && payload.candidate) {
          try {
            await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (err) {
            // ignore — sometimes candidates arrive before remoteDescription is set
          }
        }
      })
      .on('broadcast', { event: 'call-hangup' }, () => {
        this._cleanup();
        this.opts.onCallEnded();
      })
      .subscribe();
  }

  unsubscribeFromIncomingCalls() {
    if (this.inboundChannel) {
      supabase.removeChannel(this.inboundChannel);
      this.inboundChannel = null;
    }
  }

  /**
   * Initiate an outgoing call to a remote user.
   */
  async startCall(calleeId: string, callType: CallType): Promise<MediaStream> {
    this.currentCalleeId = calleeId;
    this.currentCallType = callType;

    // Get local media stream
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video',
    });

    // Create peer connection
    this.pc = this._createPeerConnection(calleeId);

    // Add local tracks
    this.localStream.getTracks().forEach(track => {
      this.pc!.addTrack(track, this.localStream!);
    });

    // Create offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Send offer to callee via their channel
    const calleeChannel = supabase.channel(`calls:${calleeId}`);
    this.outboundChannel = calleeChannel;
    
    calleeChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        calleeChannel.send({
          type: 'broadcast',
          event: 'call-offer',
          payload: {
            callerId: this.opts.localUserId,
            callerName: this.opts.localUserName,
            callerAvatar: this.opts.localUserAvatar,
            callType,
            offer,
          },
        });
      }
    });

    return this.localStream;
  }

  /**
   * Accept an incoming call.
   */
  async acceptCall(info: IncomingCallInfo): Promise<MediaStream> {
    this.currentCalleeId = info.callerId;
    this.currentCallType = info.callType;

    // Get local media stream
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: info.callType === 'video',
    });

    // Create peer connection
    this.pc = this._createPeerConnection(info.callerId);

    // Add local tracks
    this.localStream.getTracks().forEach(track => {
      this.pc!.addTrack(track, this.localStream!);
    });

    // Set remote offer
    await this.pc.setRemoteDescription(new RTCSessionDescription(info.offer));

    // Create answer
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    // Send answer to caller via their channel
    const callerChannel = supabase.channel(`calls:${info.callerId}`);
    this.outboundChannel = callerChannel;
    
    callerChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        callerChannel.send({
          type: 'broadcast',
          event: 'call-answer',
          payload: { answer },
        });
      }
    });

    this.opts.onCallConnected();
    return this.localStream;
  }

  /**
   * Reject an incoming call.
   */
  async rejectCall(callerId: string) {
    const callerChannel = supabase.channel(`calls:${callerId}`);
    callerChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        callerChannel.send({
          type: 'broadcast',
          event: 'call-hangup',
          payload: { rejected: true },
        });
        setTimeout(() => {
          supabase.removeChannel(callerChannel);
        }, 1000);
      }
    });
  }

  /**
   * Hang up the current call.
   */
  hangup() {
    if (this.currentCalleeId && this.outboundChannel) {
      this.outboundChannel.send({
        type: 'broadcast',
        event: 'call-hangup',
        payload: {},
      });
    }
    this._cleanup();
    this.opts.onCallEnded();
  }

  /**
   * Mute / unmute local audio track.
   */
  setMuted(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => { t.enabled = !muted; });
    }
  }

  /**
   * Enable / disable local video track.
   */
  setCameraEnabled(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(t => { t.enabled = enabled; });
    }
  }

  /**
   * Returns the current local MediaStream (for PIP preview).
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private _createPeerConnection(remoteUserId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Send ICE candidates to remote peer
    pc.onicecandidate = (event) => {
      if (event.candidate && this.outboundChannel) {
        this.outboundChannel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate.toJSON() },
        });
      } else if (event.candidate && this.currentCalleeId) {
        // If outboundChannel isn't ready yet, send via a temporary channel to callee
        const ch = supabase.channel(`calls:${remoteUserId}`);
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            ch.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { candidate: event.candidate!.toJSON() },
            });
          }
        });
      }
    };

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        this.opts.onRemoteStream(remoteStream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this._cleanup();
        this.opts.onCallEnded();
      }
    };

    return pc;
  }

  private _cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.outboundChannel) {
      supabase.removeChannel(this.outboundChannel);
      this.outboundChannel = null;
    }
    this.currentCalleeId = null;
  }
}
