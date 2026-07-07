'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Send, Phone, Video, MoreHorizontal, Circle, CheckCheck, Paperclip,
  Mic, Volume2, VolumeX, VideoOff, MicOff, Play, Pause, Users, User,
  X, Image, FileAudio, FileText, Download, PhoneOff, PhoneIncoming,
  Plus, Camera,
} from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import {
  supabase,
  type Conversation,
  type Message,
  type MessageType,
  type GroupConversation,
  type GroupMessage,
  type UserProfile,
} from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useLang } from '@/hooks/use-lang';
import { cn } from '@/lib/utils';
import { playNotificationSound, playHangupSound, playCallConnectedSound } from '@/lib/audio';
import { WebRTCCallManager, type IncomingCallInfo, type CallType } from '@/lib/webrtc';

// ─── Types ───────────────────────────────────────────────────────────────────

type ChatThread = {
  id: string;
  kind: 'direct' | 'group';
  otherUserId?: string;
  name: string;
  avatar: string;
  online: boolean;
  unread: number;
  lastMsg: string;
  time: string;
};

type ChatMessage = {
  id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  message_type: MessageType;
  file_url: string | null;
  file_name: string | null;
  file_mime: string | null;
  created_at: string;
};

type CallState =
  | { phase: 'idle' }
  | { phase: 'ringing-out'; callType: CallType; contact: ChatThread }
  | { phase: 'ringing-in'; info: IncomingCallInfo }
  | { phase: 'connected'; callType: CallType; startedAt: number };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function lastMsgPreview(msg: ChatMessage | null): string {
  if (!msg) return '';
  switch (msg.message_type) {
    case 'image': return '🖼️ Image';
    case 'audio': return '🎵 Audio';
    case 'file': return `📎 ${msg.file_name || 'Fichier'}`;
    case 'voice_note': return '🎙️ Note vocale';
    default: return msg.content;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Renders a single message bubble based on its type */
function MessageBubble({ msg, mine, lang }: { msg: ChatMessage; mine: boolean; lang: string }) {
  const [playing, setPlaying] = useState(false);
  const audioEl = useRef<HTMLAudioElement | null>(null);

  const bubbleStyle: React.CSSProperties = mine
    ? { background: '#B686EC', boxShadow: '0 4px 16px rgba(182,134,236,0.2)' }
    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' };

  const timeLabel = formatTime(msg.created_at, lang === 'fr' ? 'fr-FR' : 'en-US');

  const playAudio = () => {
    if (!msg.file_url) return;
    if (playing) {
      audioEl.current?.pause();
      setPlaying(false);
    } else {
      const audio = new Audio(msg.file_url);
      audioEl.current = audio;
      audio.onended = () => setPlaying(false);
      audio.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  };

  const content = (() => {
    switch (msg.message_type) {
      case 'image':
        return msg.file_url ? (
          <a href={msg.file_url} target="_blank" rel="noreferrer">
            <img
              src={msg.file_url}
              alt={msg.file_name || 'image'}
              className="max-w-[220px] max-h-[220px] rounded-xl object-cover cursor-pointer"
            />
          </a>
        ) : null;

      case 'audio':
        return msg.file_url ? (
          <div className="flex items-center gap-3 min-w-[180px]">
            <button
              onClick={playAudio}
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors',
                mine ? 'bg-white text-[#B686EC] hover:bg-white/90' : 'bg-emerald-500 text-black hover:bg-emerald-400'
              )}
            >
              {playing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <div className="flex flex-col text-xs">
              <span className="font-medium truncate max-w-[120px]">{msg.file_name}</span>
              <span className="opacity-60">
                {lang === 'fr' ? 'Fichier audio' : 'Audio file'}
              </span>
            </div>
          </div>
        ) : null;

      case 'voice_note':
        return msg.file_url ? (
          <div className="flex items-center gap-3 min-w-[200px]">
            <button
              onClick={playAudio}
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors',
                mine ? 'bg-white text-[#B686EC]' : 'bg-emerald-500 text-black'
              )}
            >
              {playing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <div className="flex items-end gap-[2px] h-5 flex-1">
              {Array.from({ length: 24 }, (_, i) => (
                <div
                  key={i}
                  style={{ height: `${30 + Math.sin(i * 0.8) * 50}%` }}
                  className={cn('w-[2px] rounded-full', mine ? 'bg-white/70' : 'bg-white/30')}
                />
              ))}
            </div>
            <span className="text-[9px] opacity-60 shrink-0">🎙️</span>
          </div>
        ) : null;

      case 'file':
        return msg.file_url ? (
          <a
            href={msg.file_url}
            download={msg.file_name || 'fichier'}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 no-underline"
          >
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
              mine ? 'bg-white/20' : 'bg-white/10'
            )}>
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-xs min-w-0">
              <span className="font-medium truncate max-w-[150px]">{msg.file_name}</span>
              <span className="opacity-60 flex items-center gap-1">
                <Download className="w-3 h-3" />
                {lang === 'fr' ? 'Télécharger' : 'Download'}
              </span>
            </div>
          </a>
        ) : null;

      default:
        return <p className="whitespace-pre-wrap break-words text-sm leading-snug">{msg.content}</p>;
    }
  })();

  return (
    <div className={cn('flex items-end gap-2 group', mine && 'flex-row-reverse')}>
      <div className="max-w-sm px-3.5 py-2.5 rounded-2xl text-white" style={bubbleStyle}>
        {!mine && msg.sender_name && (
          <div className="text-[10px] font-bold text-emerald-400 mb-1">{msg.sender_name}</div>
        )}
        {content}
        <div className={cn('flex items-center gap-1 mt-1.5', mine ? 'justify-end' : 'justify-start')}>
          <span className="text-[9px] opacity-60">{timeLabel}</span>
          {mine && <CheckCheck className="w-3 h-3 opacity-60" />}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'direct' | 'group'>('direct');

  // ── Thread state ──────────────────────────────────────────────────────────
  const [directThreads, setDirectThreads] = useState<ChatThread[]>([]);
  const [groupThreads, setGroupThreads] = useState<ChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);

  // ── Messages ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Input bar ─────────────────────────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── Recording ─────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  // ── Call state ────────────────────────────────────────────────────────────
  const [callState, setCallState] = useState<CallState>({ phase: 'idle' });
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callManagerRef = useRef<WebRTCCallManager | null>(null);

  // ── Misc refs ─────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const activeThreadRef = useRef<ChatThread | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  activeThreadRef.current = activeThread;

  const lbl = (fr: string, en: string) => lang === 'fr' ? fr : en;

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }, []);

  // ── Init WebRTC Manager ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const mgr = new WebRTCCallManager({
      localUserId: user.id,
      localUserName: user.email?.split('@')[0] || 'Moi',
      localUserAvatar: user.email?.slice(0, 2).toUpperCase() || 'ME',
      onIncomingCall: (info) => {
        playNotificationSound();
        setCallState({ phase: 'ringing-in', info });
      },
      onCallConnected: () => {
        playCallConnectedSound();
        setCallState(prev => {
          if (prev.phase === 'ringing-out') {
            return { phase: 'connected', callType: prev.callType, startedAt: Date.now() };
          }
          if (prev.phase === 'ringing-in') {
            return { phase: 'connected', callType: prev.info.callType, startedAt: Date.now() };
          }
          return prev;
        });
        callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
      },
      onCallEnded: () => {
        playHangupSound();
        if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
        setCallState({ phase: 'idle' });
        setCallDuration(0);
        setIsMuted(false);
        setIsCameraOff(false);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
      },
      onRemoteStream: (stream) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
      },
      onError: (err) => console.error('[WebRTC Error]', err),
    });

    mgr.subscribeToIncomingCalls();
    callManagerRef.current = mgr;

    return () => {
      mgr.unsubscribeFromIncomingCalls();
      callManagerRef.current = null;
    };
  }, [user]);

  // ── Attach local video to <video> after call connects ────────────────────
  useEffect(() => {
    if (callState.phase === 'connected' && localVideoRef.current) {
      const stream = callManagerRef.current?.getLocalStream();
      if (stream) localVideoRef.current.srcObject = stream;
    }
  }, [callState.phase]);

  // ── Load profiles + direct threads ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const load = async () => {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .neq('user_id', user.id);
      setAllProfiles(profiles || []);

      const { data: convs } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (convs && convs.length > 0) {
        const threads: ChatThread[] = await Promise.all(
          convs.map(async (c: Conversation) => {
            const otherId = c.participant_a === user.id ? c.participant_b : c.participant_a;
            const { data: prof } = await supabase
              .from('user_profiles')
              .select('display_name, allow_messages')
              .eq('user_id', otherId)
              .maybeSingle();
            const name = prof?.display_name || 'Utilisateur';
            return {
              id: c.id,
              kind: 'direct' as const,
              otherUserId: otherId,
              name,
              avatar: name.slice(0, 2).toUpperCase(),
              online: prof?.allow_messages ?? true,
              unread: 0,
              lastMsg: c.last_message || '',
              time: formatTime(c.last_message_at, locale),
            };
          })
        );
        setDirectThreads(threads);
      }

      // Load group threads (where user is a member)
      const { data: memberRows } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberRows && memberRows.length > 0) {
        const groupIds = memberRows.map(r => r.group_id);
        const { data: groups } = await supabase
          .from('group_conversations')
          .select('*')
          .in('id', groupIds)
          .order('last_message_at', { ascending: false });

        if (groups) {
          setGroupThreads(groups.map((g: GroupConversation) => ({
            id: g.id,
            kind: 'group' as const,
            name: g.name,
            avatar: g.avatar,
            online: false,
            unread: 0,
            lastMsg: g.last_message || '',
            time: g.last_message_at ? formatTime(g.last_message_at, locale) : '',
          })));
        }
      }

      setLoading(false);
    };

    load();

    // Real-time: new direct messages
    const msgChannel = supabase
      .channel('realtime-direct-messages')
      .on('postgres_changes' as any, { event: 'INSERT', table: 'messages' }, (payload: any) => {
        const m = payload.new as Message;
        if (m.sender_id !== user.id) playNotificationSound();

        setDirectThreads(prev => prev.map(t => {
          if (t.id === m.conversation_id) {
            return {
              ...t,
              lastMsg: m.message_type !== 'text' ? `📎 ${m.file_name || 'Fichier'}` : m.content,
              time: formatTime(m.created_at, locale),
              unread: activeThreadRef.current?.id === t.id ? 0 : t.unread + 1,
            };
          }
          return t;
        }));

        if (activeThreadRef.current?.id === m.conversation_id) {
          setMessages(prev => [...prev, m as any]);
          scrollToBottom();
        }
      })
      .subscribe();

    // Real-time: new group messages
    const groupMsgChannel = supabase
      .channel('realtime-group-messages')
      .on('postgres_changes' as any, { event: 'INSERT', table: 'group_messages' }, (payload: any) => {
        const m = payload.new as GroupMessage;
        if (m.sender_id !== user.id) playNotificationSound();

        setGroupThreads(prev => prev.map(t => {
          if (t.id === m.group_id) {
            return {
              ...t,
              lastMsg: m.message_type !== 'text' ? `📎 ${m.file_name || 'Fichier'}` : m.content,
              time: formatTime(m.created_at, locale),
              unread: activeThreadRef.current?.id === t.id ? 0 : t.unread + 1,
            };
          }
          return t;
        }));

        if (activeThreadRef.current?.id === m.group_id) {
          setMessages(prev => [...prev, m as any]);
          scrollToBottom();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(groupMsgChannel);
    };
  }, [user, locale, scrollToBottom]);

  // ── Load messages when thread changes ────────────────────────────────────
  useEffect(() => {
    if (!activeThread) { setMessages([]); return; }

    const load = async () => {
      if (activeThread.kind === 'direct') {
        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', activeThread.id)
          .order('created_at', { ascending: true });
        setMessages((data || []) as any);
      } else {
        const { data } = await supabase
          .from('group_messages')
          .select('*')
          .eq('group_id', activeThread.id)
          .order('created_at', { ascending: true });
        setMessages((data || []) as any);
      }
      setDirectThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, unread: 0 } : t));
      setGroupThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, unread: 0 } : t));
      scrollToBottom();
    };
    load();
  }, [activeThread, scrollToBottom]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      recordingStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (
    content: string,
    type: MessageType = 'text',
    fileUrl: string | null = null,
    fileName: string | null = null,
    fileMime: string | null = null
  ) => {
    if (!user || !activeThread) return;

    if (activeThread.kind === 'direct') {
      const { data: newMsg } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeThread.id,
          sender_id: user.id,
          content: content || (fileName || ''),
          message_type: type,
          file_url: fileUrl,
          file_name: fileName,
          file_mime: fileMime,
        })
        .select()
        .maybeSingle();

      if (newMsg) {
        setMessages(prev => [...prev, newMsg as any]);
        scrollToBottom();
        const preview = type !== 'text' ? `📎 ${fileName || 'Fichier'}` : content;
        await supabase
          .from('conversations')
          .update({ last_message: preview, last_message_at: new Date().toISOString() })
          .eq('id', activeThread.id);
        setDirectThreads(prev => prev.map(t =>
          t.id === activeThread.id ? { ...t, lastMsg: preview, time: formatTime(new Date().toISOString(), locale) } : t
        ));
      }
    } else {
      const senderProfile = allProfiles.find(p => p.user_id === user.id);
      const senderName = senderProfile?.display_name || user.email?.split('@')[0] || 'Moi';

      const { data: newMsg } = await supabase
        .from('group_messages')
        .insert({
          group_id: activeThread.id,
          sender_id: user.id,
          sender_name: senderName,
          content: content || (fileName || ''),
          message_type: type,
          file_url: fileUrl,
          file_name: fileName,
          file_mime: fileMime,
        })
        .select()
        .maybeSingle();

      if (newMsg) {
        setMessages(prev => [...prev, newMsg as any]);
        scrollToBottom();
        const preview = type !== 'text' ? `📎 ${fileName || 'Fichier'}` : content;
        await supabase
          .from('group_conversations')
          .update({ last_message: preview, last_message_at: new Date().toISOString() })
          .eq('id', activeThread.id);
        setGroupThreads(prev => prev.map(t =>
          t.id === activeThread.id ? { ...t, lastMsg: preview, time: formatTime(new Date().toISOString(), locale) } : t
        ));
      }
    }
  };

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    await sendMessage(text, 'text');
  };

  // ── Emoji ─────────────────────────────────────────────────────────────────
  const onEmojiClick = (data: EmojiClickData) => {
    setInputText(prev => prev + data.emoji);
    setShowEmojiPicker(false);
  };

  // ── File upload to Supabase Storage ──────────────────────────────────────
  const uploadFile = async (file: File, type: MessageType): Promise<{ url: string; name: string; mime: string } | null> => {
    const ext = file.name.split('.').pop();
    const path = `${user!.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('chat-files')
      .upload(path, file, { upsert: false, contentType: file.type });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(path);
    return { url: urlData.publicUrl, name: file.name, mime: file.type };
  };

  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: MessageType
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setShowAttachMenu(false);
    const result = await uploadFile(file, type);
    if (result) {
      await sendMessage('', type, result.url, result.name, result.mime);
    }
    setUploading(false);
    e.target.value = '';
  };

  // ── Voice recording ───────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        setUploading(true);
        const result = await uploadFile(file, 'voice_note');
        if (result) await sendMessage('', 'voice_note', result.url, result.name, result.mime);
        setUploading(false);
        recordingStreamRef.current?.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch {
      alert(lbl('Accès au microphone refusé.', 'Microphone access denied.'));
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (recordingIntervalRef.current) { clearInterval(recordingIntervalRef.current); recordingIntervalRef.current = null; }
    setIsRecording(false);
    setRecordingTime(0);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current!.onstop = null;
      mediaRecorderRef.current?.stop();
    }
    if (recordingIntervalRef.current) { clearInterval(recordingIntervalRef.current); recordingIntervalRef.current = null; }
    recordingStreamRef.current?.getTracks().forEach(t => t.stop());
    setIsRecording(false);
    setRecordingTime(0);
  };

  // ── Calls ─────────────────────────────────────────────────────────────────
  const initiateCall = async (callType: CallType) => {
    if (!activeThread || !callManagerRef.current || activeThread.kind === 'group') return;
    setCallState({ phase: 'ringing-out', callType, contact: activeThread });
    try {
      const localStream = await callManagerRef.current.startCall(activeThread.otherUserId!, callType);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    } catch (err) {
      callManagerRef.current.hangup();
      alert(lbl('Impossible de démarrer l\'appel. Vérifiez les permissions.', 'Could not start call. Check permissions.'));
    }
  };

  const acceptCall = async () => {
    if (callState.phase !== 'ringing-in' || !callManagerRef.current) return;
    try {
      const localStream = await callManagerRef.current.acceptCall(callState.info);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
      setCallState({ phase: 'connected', callType: callState.info.callType, startedAt: Date.now() });
      callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
      playCallConnectedSound();
    } catch {
      alert(lbl('Impossible d\'accepter l\'appel.', 'Could not accept the call.'));
    }
  };

  const rejectCall = async () => {
    if (callState.phase !== 'ringing-in' || !callManagerRef.current) return;
    await callManagerRef.current.rejectCall(callState.info.callerId);
    setCallState({ phase: 'idle' });
  };

  const hangupCall = () => {
    callManagerRef.current?.hangup();
  };

  const toggleMute = () => {
    setIsMuted(prev => {
      callManagerRef.current?.setMuted(!prev);
      return !prev;
    });
  };

  const toggleCamera = () => {
    setIsCameraOff(prev => {
      callManagerRef.current?.setCameraEnabled(prev); // prev=true means it WAS off, now enable
      return !prev;
    });
  };

  // ── Start new direct conversation ─────────────────────────────────────────
  const openDirectConversation = async (profile: UserProfile) => {
    const existing = directThreads.find(t => t.otherUserId === profile.user_id);
    if (existing) { setActiveTab('direct'); setActiveThread(existing); return; }

    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        participant_a: user!.id,
        participant_b: profile.user_id,
        last_message: '',
      })
      .select()
      .maybeSingle();

    if (newConv) {
      const name = profile.display_name || 'Utilisateur';
      const thread: ChatThread = {
        id: newConv.id,
        kind: 'direct',
        otherUserId: profile.user_id,
        name,
        avatar: name.slice(0, 2).toUpperCase(),
        online: profile.allow_messages,
        unread: 0,
        lastMsg: '',
        time: '',
      };
      setDirectThreads(prev => [thread, ...prev]);
      setActiveTab('direct');
      setActiveThread(thread);
    }
  };

  const threads = activeTab === 'direct' ? directThreads : groupThreads;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="h-[calc(100vh-5rem)] flex overflow-hidden rounded-2xl border shadow-sm -mt-6 -mx-4 md:-mx-8 relative"
      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelected(e, 'image')} />
      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileSelected(e, 'audio')} />
      <input ref={fileInputRef} type="file" accept=".pdf,.txt,.doc,.docx,.csv" className="hidden" onChange={(e) => handleFileSelected(e, 'file')} />

      {/* Remote audio element (invisible) */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      {/* ── Left Panel: Thread List ───────────────────────────────────────── */}
      <div
        className="w-72 flex-shrink-0 border-r flex flex-col"
        style={{ background: 'rgba(255,255,255,0.015)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="p-4 border-b flex flex-col gap-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <h2 className="font-bold text-sm text-white">{t('msg_title')}</h2>

          {/* Tabs */}
          <div className="flex bg-white/5 p-0.5 rounded-xl border border-white/5">
            {(['direct', 'group'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setActiveThread(null); }}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
                  activeTab === tab ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'
                )}
              >
                {tab === 'direct' ? <User className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                {tab === 'direct' ? lbl('Individuels', 'Direct') : lbl('Groupes', 'Groups')}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('msg_search')}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs outline-none text-white placeholder:text-white/30 focus:border-purple-500/50 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-xs text-white/40 text-center">{t('loading')}</div>
          ) : threads.length === 0 ? (
            <div className="p-4 text-xs text-white/40 text-center">
              {lbl('Aucune conversation.', 'No conversations yet.')}
            </div>
          ) : (
            threads.map(thread => (
              <button
                key={thread.id}
                onClick={() => setActiveThread(thread)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left border-b',
                  activeThread?.id === thread.id ? 'bg-purple-500/10 border-l-2 border-l-[#B686EC]' : 'border-transparent'
                )}
                style={{ borderBottomColor: 'rgba(255,255,255,0.05)' }}
              >
                <div className="relative shrink-0">
                  <div className={cn(
                    'w-10 h-10 rounded-full bg-gradient-to-tr text-xs font-bold grid place-items-center border',
                    thread.kind === 'group'
                      ? 'from-purple-500/20 to-purple-400/20 border-purple-500/30 text-[#B686EC]'
                      : 'from-emerald-500/20 to-emerald-400/20 border-emerald-500/30 text-emerald-400'
                  )}>
                    {thread.avatar}
                  </div>
                  {thread.online && thread.kind === 'direct' && (
                    <Circle className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500 absolute bottom-0 right-0" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-xs text-white truncate">{thread.name}</span>
                    <span className="text-[10px] text-white/40 shrink-0 ml-2">{thread.time}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className="text-[11px] text-white/55 truncate flex-1">{thread.lastMsg}</p>
                    {thread.unread > 0 && (
                      <span className="px-1.5 h-4 rounded-full bg-[#B686EC] text-[10px] font-extrabold text-white flex items-center shrink-0">
                        {thread.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Center Panel: Chat Window ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 border-r" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {activeThread ? (
          <>
            {/* Header */}
            <div
              className="h-14 px-5 flex items-center justify-between flex-shrink-0 border-b"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-full bg-gradient-to-tr text-xs font-bold grid place-items-center border',
                  activeThread.kind === 'group'
                    ? 'from-purple-500/20 to-purple-400/20 border-purple-500/30 text-[#B686EC]'
                    : 'from-emerald-500/20 to-emerald-400/20 border-emerald-500/30 text-emerald-400'
                )}>
                  {activeThread.avatar}
                </div>
                <div>
                  <div className="font-bold text-sm text-white">{activeThread.name}</div>
                  <div className="text-[10px] text-white/40">
                    {activeThread.kind === 'group'
                      ? lbl('Discussion de groupe', 'Group chat')
                      : activeThread.online ? t('msg_online') : t('msg_offline')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {activeThread.kind === 'direct' && (
                  <>
                    <button
                      onClick={() => initiateCall('audio')}
                      title={lbl('Appel vocal', 'Voice call')}
                      className="p-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => initiateCall('video')}
                      title={lbl('Appel vidéo', 'Video call')}
                      className="p-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button className="p-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  mine={msg.sender_id === user?.id}
                  lang={lang}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div
              className="p-3 flex-shrink-0 border-t relative"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              {/* Emoji picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-16 left-4 z-50">
                  <EmojiPicker
                    theme={Theme.DARK}
                    onEmojiClick={onEmojiClick}
                    lazyLoadEmojis
                    height={350}
                    width={300}
                  />
                </div>
              )}

              {/* Attach menu */}
              {showAttachMenu && (
                <div className="absolute bottom-16 left-12 z-50 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl p-2 flex flex-col gap-1 min-w-[160px]">
                  <button
                    onClick={() => { setShowAttachMenu(false); imageInputRef.current?.click(); }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-left text-sm text-white transition-colors"
                  >
                    <Image className="w-4 h-4 text-purple-400" />
                    {lbl('Image', 'Image')}
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); audioInputRef.current?.click(); }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-left text-sm text-white transition-colors"
                  >
                    <FileAudio className="w-4 h-4 text-emerald-400" />
                    {lbl('Fichier audio', 'Audio file')}
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click(); }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-left text-sm text-white transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-400" />
                    {lbl('Document', 'Document')}
                  </button>
                </div>
              )}

              {/* Click outside to close picker/menu */}
              {(showEmojiPicker || showAttachMenu) && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => { setShowEmojiPicker(false); setShowAttachMenu(false); }}
                />
              )}

              {isRecording ? (
                /* Recording mode */
                <div className="flex items-center justify-between gap-3 bg-red-950/20 border border-red-500/30 rounded-2xl px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-semibold text-red-400">
                      {lbl('Enregistrement', 'Recording')} {formatDuration(recordingTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={cancelRecording} className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                    <button onClick={stopRecording} className="w-8 h-8 rounded-xl bg-red-500 text-white grid place-items-center hover:bg-red-600">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal input */
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2">
                  <button
                    onClick={() => { setShowAttachMenu(v => !v); setShowEmojiPicker(false); }}
                    className="text-white/40 hover:text-[#B686EC] transition-colors shrink-0"
                    title={lbl('Joindre un fichier', 'Attach file')}
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendText()}
                    placeholder={uploading ? lbl('Upload en cours...', 'Uploading...') : t('msg_write')}
                    disabled={uploading}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/30 text-white disabled:opacity-50"
                  />
                  <button
                    onClick={() => { setShowEmojiPicker(v => !v); setShowAttachMenu(false); }}
                    className="text-white/40 hover:text-yellow-400 transition-colors shrink-0"
                    title={lbl('Emojis', 'Emojis')}
                  >
                    <span className="text-base">😊</span>
                  </button>
                  {inputText.trim() ? (
                    <button
                      onClick={handleSendText}
                      className="w-8 h-8 rounded-xl bg-emerald-500 text-[#071008] grid place-items-center hover:bg-emerald-400 transition-colors shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      className="text-white/40 hover:text-[#B686EC] transition-colors shrink-0"
                      title={lbl('Note vocale', 'Voice note')}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center text-white/30 p-8">
            <div className="w-16 h-16 rounded-full bg-white/5 grid place-items-center">
              <Phone className="w-7 h-7" />
            </div>
            <p className="text-sm">
              {lbl('Sélectionnez une conversation pour commencer.', 'Select a conversation to get started.')}
            </p>
          </div>
        )}
      </div>

      {/* ── Right Panel: Members ──────────────────────────────────────────── */}
      <div className="hidden lg:flex w-52 flex-shrink-0 flex-col" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <h3 className="font-bold text-xs text-white/70">{t('msg_filter_members')}</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {allProfiles.length === 0 ? (
            <div className="text-[10px] text-white/40 p-2 text-center">
              {lbl('Aucun autre membre.', 'No other members.')}
            </div>
          ) : (
            allProfiles.map(p => {
              const name = p.display_name || 'Utilisateur';
              return (
                <button
                  key={p.id}
                  onClick={() => openDirectConversation(p)}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500/20 to-emerald-400/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold grid place-items-center shrink-0">
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-white/80 truncate group-hover:text-emerald-400 transition-colors text-left">
                    {name}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CALL OVERLAYS                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* Incoming call notification */}
      {callState.phase === 'ringing-in' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-2xl">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-2xl min-w-[280px]">
            <div className="relative">
              <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-ping" />
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#B686EC] to-purple-400 text-white font-bold text-2xl grid place-items-center z-10 relative">
                {callState.info.callerAvatar}
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-white font-bold text-lg">{callState.info.callerName}</h3>
              <p className="text-white/50 text-sm animate-pulse mt-1">
                {callState.info.callType === 'video'
                  ? lbl('Appel vidéo entrant...', 'Incoming video call...')
                  : lbl('Appel audio entrant...', 'Incoming audio call...')}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={rejectCall}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-all"
                title={lbl('Refuser', 'Decline')}
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <button
                onClick={acceptCall}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg transition-all"
                title={lbl('Accepter', 'Accept')}
              >
                <PhoneIncoming className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outgoing ringing */}
      {callState.phase === 'ringing-out' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm rounded-2xl">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-ping opacity-60" style={{ animationDuration: '2s' }} />
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#B686EC] to-purple-400 text-white font-bold text-2xl grid place-items-center z-10 relative">
                {callState.contact.avatar}
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-white font-bold text-xl">{callState.contact.name}</h3>
              <p className="text-white/50 text-sm animate-pulse mt-2">
                {lbl('Appel en cours...', 'Calling...')}
              </p>
            </div>
            <button
              onClick={hangupCall}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-all"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Active call screen */}
      {callState.phase === 'connected' && (
        <div className="absolute inset-0 z-50 flex flex-col bg-slate-950/95 rounded-2xl">
          {/* Remote video (full screen) */}
          {callState.callType === 'video' && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover rounded-2xl"
            />
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 rounded-2xl" />

          {/* Top bar */}
          <div className="relative z-10 flex items-center justify-between p-6">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full text-[10px] text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {lbl('Chiffré de bout en bout', 'End-to-end encrypted')}
            </div>
            <div className="bg-white/10 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-white">
              {formatDuration(callDuration)}
            </div>
          </div>

          {/* Center contact info (voice call only) */}
          {callState.callType === 'audio' && (
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="absolute w-40 h-40 rounded-full border border-purple-500/20 animate-pulse" />
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#B686EC] to-purple-400 text-white font-bold text-3xl grid place-items-center shadow-2xl">
                  {activeThread?.avatar}
                </div>
              </div>
              <h3 className="text-xl font-bold text-white">{activeThread?.name}</h3>
              <p className="text-white/50 text-sm">{lbl('Connecté', 'Connected')}</p>
            </div>
          )}

          {/* Local PIP (video call) */}
          {callState.callType === 'video' && (
            <div className="absolute bottom-28 right-6 z-20 w-32 h-44 rounded-xl border border-white/20 overflow-hidden bg-black shadow-xl">
              {isCameraOff ? (
                <div className="w-full h-full flex items-center justify-center">
                  <VideoOff className="w-6 h-6 text-white/30" />
                </div>
              ) : (
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              )}
            </div>
          )}

          {/* Call controls */}
          <div className="relative z-10 flex flex-col items-center gap-3 pb-8">
            <div className="flex items-center gap-5 bg-white/10 backdrop-blur-md px-7 py-4 rounded-full border border-white/10 shadow-xl">
              <button
                onClick={toggleMute}
                className={cn(
                  'p-3.5 rounded-full transition-all',
                  isMuted ? 'bg-red-500/30 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'
                )}
                title={isMuted ? lbl('Réactiver', 'Unmute') : lbl('Couper', 'Mute')}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {callState.callType === 'video' && (
                <button
                  onClick={toggleCamera}
                  className={cn(
                    'p-3.5 rounded-full transition-all',
                    isCameraOff ? 'bg-red-500/30 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'
                  )}
                  title={isCameraOff ? lbl('Activer caméra', 'Enable camera') : lbl('Désactiver caméra', 'Disable camera')}
                >
                  {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                </button>
              )}

              <button
                onClick={hangupCall}
                className="p-4 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-lg transition-all scale-110"
                title={lbl('Raccrocher', 'Hang up')}
              >
                <PhoneOff className="w-5 h-5" />
              </button>

              <button
                className="p-3.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
                title={lbl('Haut-parleur', 'Speaker')}
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
