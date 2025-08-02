import ChatContainer from '@/components/chat/chat-container';

export default function ChatPage() {
  return (
    <div className="h-screen">
      <ChatContainer 
        userId="indian-learner"
        initialLanguage="en"
        learningLevel="beginner"
        autoTranslate={true}
        preferredLanguage="hi"
      />
    </div>
  );
}