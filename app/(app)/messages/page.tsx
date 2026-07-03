'use client';

import { useState } from 'react';
import { Search, Send, Phone, Video, MoreHorizontal, Circle, CheckCheck, Paperclip, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

const CONTACTS = [
  { id: 1, name: 'Michelle Smith', role: 'Personal Development Trainer', avatar: 'MS', online: true, unread: 2, lastMsg: "Coming along nicely, we've got a draft for the client design completed, take a look 😊", time: '10:05' },
  { id: 2, name: 'Andrew Brain', role: 'Vocal Coach', avatar: 'AB', online: false, unread: 0, lastMsg: 'That sounds great, I can look into it.', time: '9:48' },
  { id: 3, name: 'Jimmy Carter', role: 'Music Theory', avatar: 'JC', online: true, unread: 0, lastMsg: 'OK je commence aujourd\'hui', time: 'Hier' },
  { id: 4, name: 'Samantha Doe', role: 'Breathing Techniques', avatar: 'SD', online: false, unread: 0, lastMsg: 'Clients loved the new design.', time: 'Mer' },
];

const MESSAGES = [
  { id: 1, from: 'Michelle Smith', avatar: 'MS', text: "Coming along nicely, we've got a draft for the client design completed, take a look 😊", time: '10:01', mine: false },
  { id: 2, from: 'Moi', avatar: 'M', text: 'draft sketch', time: '10:03', mine: true },
  { id: 3, from: 'Michelle Smith', avatar: 'MS', text: 'Clients loved the new design.', time: '10:05', mine: false },
  { id: 4, from: 'Moi', avatar: 'M', text: 'Super job.', time: '10:06', mine: true },
  { id: 5, from: 'Michelle Smith', avatar: 'MS', text: 'Got it all worked out 😊', time: '10:10', mine: false },
];

const MEMBERS = [
  { id: 1, name: 'Michelle Smith', avatar: 'MS', online: true },
  { id: 2, name: 'Andrew Brain', avatar: 'AB', online: true },
  { id: 3, name: 'Jimmy Carter', avatar: 'JC', online: true },
  { id: 4, name: 'Samantha Doe', avatar: 'SD', online: false },
  { id: 5, name: 'Xander Dale', avatar: 'XD', online: false },
  { id: 6, name: 'Beatriz Summers', avatar: 'BS', online: false },
  { id: 7, name: 'Cassie Wills', avatar: 'CW', online: false },
];

export default function MessagesPage() {
  const [activeContact, setActiveContact] = useState(CONTACTS[0]);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(MESSAGES);

  const sendMessage = () => {
    if (!message.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now(), from: 'Moi', avatar: 'M', text: message,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), mine: true,
    }]);
    setMessage('');
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex overflow-hidden rounded-2xl border border-border bg-card shadow-sm -mt-6 -mx-4 md:-mx-8">
      {/* Left: Contact list */}
      <div className="w-72 flex-shrink-0 border-r border-border flex flex-col bg-white">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-sm text-foreground mb-3">Messages</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search messages"
              className="w-full pl-9 pr-4 py-2 bg-muted rounded-xl text-xs border-none outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {CONTACTS.map((c) => (
            <button key={c.id} onClick={() => setActiveContact(c)}
              className={cn('w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/40',
                activeContact.id === c.id && 'bg-primary/5 border-l-2 border-l-primary'
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
              {c.unread > 0 && (
                <div className="w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full grid place-items-center shrink-0 mt-1">{c.unread}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Center: Thread */}
      <div className="flex-1 flex flex-col bg-background min-w-0">
        <div className="h-14 border-b border-border px-5 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary text-white text-xs font-bold grid place-items-center">{activeContact.avatar}</div>
            <div>
              <div className="font-bold text-sm text-foreground">{activeContact.name}</div>
              <div className="text-[10px] text-muted-foreground">{activeContact.role}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"><Phone className="w-4 h-4" /></button>
            <button className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"><Video className="w-4 h-4" /></button>
            <button className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"><MoreHorizontal className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex items-end gap-2', msg.mine && 'flex-row-reverse')}>
              {!msg.mine && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-secondary text-white text-[10px] font-bold grid place-items-center shrink-0">{msg.avatar}</div>
              )}
              <div className={cn('max-w-xs px-4 py-2.5 rounded-2xl text-sm shadow-sm',
                msg.mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-white border border-border text-foreground rounded-bl-sm'
              )}>
                <p>{msg.text}</p>
                <div className={cn('flex items-center gap-1 mt-1', msg.mine ? 'justify-end' : 'justify-start')}>
                  <span className={cn('text-[10px]', msg.mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{msg.time}</span>
                  {msg.mine && <CheckCheck className="w-3 h-3 text-primary-foreground/70" />}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border p-4 bg-white flex-shrink-0">
          <div className="flex items-center gap-3 bg-muted rounded-2xl px-4 py-2.5">
            <button className="text-muted-foreground hover:text-primary transition-colors"><Paperclip className="w-4 h-4" /></button>
            <input type="text" value={message} onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Écrire un message..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
            />
            <button className="text-muted-foreground hover:text-primary transition-colors"><Smile className="w-4 h-4" /></button>
            <button onClick={sendMessage} className="w-8 h-8 rounded-xl bg-primary text-primary-foreground grid place-items-center hover:opacity-90 transition-opacity shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Members */}
      <div className="hidden lg:flex w-52 flex-shrink-0 border-l border-border flex-col bg-white">
        <div className="p-4 border-b border-border">
          <h3 className="font-bold text-xs text-foreground">Filter members</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {MEMBERS.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="relative shrink-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary/70 to-secondary/70 text-white text-[9px] font-bold grid place-items-center">{m.avatar}</div>
                <Circle className={cn('w-2 h-2 absolute -bottom-0.5 -right-0.5', m.online ? 'fill-green-500 text-green-500' : 'fill-gray-300 text-gray-300')} />
              </div>
              <span className="text-xs font-medium text-foreground truncate">{m.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
