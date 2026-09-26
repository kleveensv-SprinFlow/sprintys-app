import re
with open('c:/Users/kleve/Sprintflow/sprintys-app/app/chat/sprinty.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(
    r'export default function MessageScreen\(\) \{\s*const \[messages, setMessages\] = useState\(\[\s*\{ role: .system., content: buildSystemPrompt\(\) \}, \s*\{ role: .assistant., content: .*? \}\s*\]\);',
    '''import { create } from "zustand";

interface SprintyChatStore {
  messages: { role: string; content: string }[];
  setMessages: (msgs: { role: string; content: string }[]) => void;
}

const useSprintyChatStore = create<SprintyChatStore>((set) => ({
  messages: [
    { role: "system", content: buildSystemPrompt() }, 
    { role: "assistant", content: "Salut ! Je suis Sprinty, ton coach IA personnel. Je suis prêt à t\'accompagner. Que veux-tu faire aujourd\'hui ?" }
  ],
  setMessages: (msgs) => set({ messages: msgs }),
}));

export default function MessageScreen() {
  const { messages, setMessages } = useSprintyChatStore();''',
    text,
    flags=re.DOTALL
)

with open('c:/Users/kleve/Sprintflow/sprintys-app/app/chat/sprinty.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
