'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Send, Phone, Video, MoreHorizontal, Circle, CheckCheck, Paperclip, Smile } from 'lucide-react';
import { supabase, type Conversation, type Message, type UserProfile } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useLang } from '@/hooks/use-lang';
import { cn } from '@/lib/utils';

type Contact = {
  id: string; // conversation_id
  otherUserId: string;
  name: string;
  avatar: string;
  online: boolean;
  unread: number;
  lastMsg: string;
  time: string;
};

export default function MessagesPage() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load all profiles & conversations
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);

      // 1. Get all profiles to allow starting conversations
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .neq('user_id', user.id);
      
      setAllProfiles(profiles || []);

      // 2. Get user conversations
      const { data: convs } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (convs && convs.length > 0) {
        const contactList: Contact[] = await Promise.all(
          convs.map(async (c: Conversation) => {
            const otherUserId = c.participant_a === user.id ? c.participant_b : c.participant_a;
            
            // Get profile of the other user
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', otherUserId)
              .maybeSingle();

            const name = profile?.display_name || 'Utilisateur';
            
            // Format date/time
            const date = new Date(c.last_message_at);
            const time = date.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });

            return {
              id: c.id,
              otherUserId,
              name,
              avatar: name.slice(0, 2).toUpperCase(),
              online: profile?.allow_messages ?? true,
              unread: 0,
              lastMsg: c.last_message || '',
              time,
            };
          })
        );
        setContacts(contactList);
        setActiveContact(contactList[0]);
      } else {
        setContacts([]);
      }
      setLoading(false);
    };

    loadData();

    // Subscribe to new messages for real-time chat
    const channel = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', table: 'messages' },
        (payload: any) => {
          const newMsg = payload.new as Message;
          if (activeContact && newMsg.conversation_id === activeContact.id) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeContact?.id]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeContact) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeContact.id)
        .order('created_at', { ascending: true });
      
      setMessages(data || []);
      scrollToBottom();
    };

    loadMessages();
  }, [activeContact]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || !activeContact) return;

    const content = messageText.trim();
    setMessageText('');

    // Insert message into table
    const { data: newMsg } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeContact.id,
        sender_id: user.id,
        content,
      })
      .select()
      .maybeSingle();

    if (newMsg) {
      setMessages((prev) => [...prev, newMsg]);
      scrollToBottom();

      // Update last message in conversation
      await supabase
        .from('conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', activeContact.id);
    }
  };

  const startNewConversation = async (otherUser: UserProfile) => {
    if (!user) return;

    // Check if conversation already exists
    const existing = contacts.find((c) => c.otherUserId === otherUser.user_id);
    if (existing) {
      setActiveContact(existing);
      return;
    }

    // Create a new conversation record in Supabase
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        participant_a: user.id,
        participant_b: otherUser.user_id,
        last_message: lang === 'fr' ? 'Nouvelle conversation' : 'New conversation',
      })
      .select()
      .maybeSingle();

    if (newConv) {
      const name = otherUser.display_name || 'Utilisateur';
      const newContact: Contact = {
        id: newConv.id,
        otherUserId: otherUser.user_id,
        name,
        avatar: name.slice(0, 2).toUpperCase(),
        online: otherUser.allow_messages,
        unread: 0,
        lastMsg: newConv.last_message || '',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      
      setContacts((prev) => [newContact, ...prev]);
      setActiveContact(newContact);
    }
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex overflow-hidden rounded-2xl border border-border bg-card shadow-sm -mt-6 -mx-4 md:-mx-8">
      {/* Left: Contact list */}
      <div className="w-72 flex-shrink-0 border-r border-border flex flex-col bg-white">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-sm text-foreground mb-3">{t('msg_title')}</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder={t('msg_search')}
              className="w-full pl-9 pr-4 py-2 bg-muted rounded-xl text-xs border-none outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-xs text-muted-foreground text-center">{t('loading')}</div>
          ) : contacts.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground text-center">
              {lang === 'fr' ? 'Aucune conversation.' : 'No conversations.'}
            </div>
          ) : (
            contacts.map((c) => (
              <button key={c.id} onClick={() => setActiveContact(c)}
                className={cn('w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/40',
                  activeContact?.id === c.id && 'bg-primary/5 border-l-2 border-l-primary'
                )}>
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary text-white text-xs font-bold grid place-items-center">
                    {c.avatar}
                  </div>
                  {c.online && <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500 absolute bottom-0 right-0" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-xs text-foreground truncate">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{c.time}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{c.lastMsg}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Center: Thread */}
      <div className="flex-1 flex flex-col bg-background min-w-0 border-r border-border">
        {activeContact ? (
          <>
            <div className="h-14 border-b border-border px-5 flex items-center justify-between bg-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary text-white text-xs font-bold grid place-items-center">{activeContact.avatar}</div>
                <div>
                  <div className="font-bold text-sm text-foreground">{activeContact.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {activeContact.online ? t('msg_online') : t('msg_offline')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"><Phone className="w-4 h-4" /></button>
                <button className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"><Video className="w-4 h-4" /></button>
                <button className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"><MoreHorizontal className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg) => {
                const mine = msg.sender_id === user?.id;
                const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={msg.id} className={cn('flex items-end gap-2', mine && 'flex-row-reverse')}>
                    <div className={cn('max-w-xs px-4 py-2.5 rounded-2xl text-sm shadow-sm',
                      mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-white border border-border text-foreground rounded-bl-sm'
                    )}>
                      <p>{msg.content}</p>
                      <div className={cn('flex items-center gap-1 mt-1', mine ? 'justify-end' : 'justify-start')}>
                        <span className={cn('text-[10px]', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{time}</span>
                        {mine && <CheckCheck className="w-3 h-3 text-primary-foreground/70" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-border p-4 bg-white flex-shrink-0">
              <div className="flex items-center gap-3 bg-muted rounded-2xl px-4 py-2.5">
                <button className="text-muted-foreground hover:text-primary transition-colors"><Paperclip className="w-4 h-4" /></button>
                <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={t('msg_write')}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
                />
                <button className="text-muted-foreground hover:text-primary transition-colors"><Smile className="w-4 h-4" /></button>
                <button onClick={handleSendMessage} className="w-8 h-8 rounded-xl bg-primary text-primary-foreground grid place-items-center hover:opacity-90 transition-opacity shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-sm text-muted-foreground">
            {lang === 'fr' ? 'Sélectionnez un membre pour démarrer une conversation.' : 'Select a member to start a conversation.'}
          </div>
        )}
      </div>

      {/* Right: Members List (Start new conversation) */}
      <div className="hidden lg:flex w-52 flex-shrink-0 flex-col bg-white">
        <div className="p-4 border-b border-border">
          <h3 className="font-bold text-xs text-foreground">{t('msg_filter_members')}</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {allProfiles.length === 0 ? (
            <div className="text-[10px] text-muted-foreground p-2 text-center">
              {lang === 'fr' ? 'Aucun autre membre inscrit.' : 'No other registered members.'}
            </div>
          ) : (
            allProfiles.map((p) => {
              const name = p.display_name || 'Utilisateur';
              return (
                <div key={p.id} onClick={() => startNewConversation(p)}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="relative shrink-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary/70 to-secondary/70 text-white text-[9px] font-bold grid place-items-center">
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">{name}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
