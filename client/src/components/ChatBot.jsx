import { useState, useRef, useEffect } from "react";

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      content:
        "Hi! I can help you with movies, showtimes, and seat availability. Ask me about a movie to get started.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const baseUrl = (import.meta.env.VITE_BASE_URL || "").replace(/\/$/, "");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const pushMessage = (msg) => setMessages((prev) => [...prev, msg]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    pushMessage({ sender: "user", content: text });
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${baseUrl}/api/chat/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();

      if (data.type === "movies" && data.movies) {
        pushMessage({ sender: "bot", content: data.answer });
        data.movies.forEach((m) => {
          pushMessage({
            sender: "bot",
            content: (
              <div className="flex gap-2 items-start">
                <img
                  src={m.poster || "/fallback-poster.jpg"}
                  alt={m.title}
                  className="w-16 h-24 object-cover rounded"
                />
                <div>
                  <p className="font-bold text-sm">{m.title}</p>
                  <p className="text-xs">Showtime: {new Date(m.showDateTime).toLocaleString()}</p>
                  <p className="text-xs">Rating: {m.rating} ⭐ | Runtime: {m.runtime} mins</p>
                  <p className="text-xs mt-1">To book, please use the main booking page.</p>
                </div>
              </div>
            ),
          });
        });
      } else if (data.type === "movieInfo" && data.movie) {
        const m = data.movie;
        pushMessage({ sender: "bot", content: data.answer });
        pushMessage({
          sender: "bot",
          content: (
            <div className="flex gap-2 items-start">
              <img src={m.poster || "/fallback-poster.jpg"} alt={m.title} className="w-20 h-28 object-cover rounded" />
              <div>
                <p className="font-bold text-lg">{m.title}</p>
                <p className="text-sm">Rating: {m.rating} ⭐ | Runtime: {m.runtime} mins</p>
                {m.showDateTime && <p className="text-sm">Next show: {new Date(m.showDateTime).toLocaleString()}</p>}
                <p className="mt-1 text-sm">{m.overview}</p>
                <p className="mt-1 text-sm whitespace-pre-line">{data.guide}</p>
                <p className="mt-2 text-xs">To book, please use the main booking page.</p>
              </div>
            </div>
          ),
        });
      } else if (data.type === "seatInfo") {
        pushMessage({ sender: "bot", content: data.answer });
        if (data.showId) {
          pushMessage({
            sender: "bot",
            content: `To book tickets for this show, please visit the main booking page and search by the show ID: ${data.showId}.`,
          });
        }
      } else {
        // Fallback text responses for other intents
        pushMessage({ sender: "bot", content: data.answer || "Sorry, I didn't understand that." });
      }
    } catch (err) {
      console.error(err);
      pushMessage({ sender: "bot", content: "Error reaching server. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const bubbleClass = (msg) =>
    `p-2 rounded-lg max-w-[80%] text-sm ${
      msg.sender === "bot" ? "bg-gray-200 text-black self-start" : "bg-purple-100 text-black self-end ml-auto"
    }`;

  return (
    <div>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 bg-purple-500 text-white w-14 h-14 rounded-full shadow-lg hover:bg-purple-600 transition-colors"
        >
          <span className="text-xl">💬</span>
        </button>
      )}
      {open && (
        <div className="fixed bottom-5 right-5 w-80 h-[500px] bg-white shadow-xl rounded-lg flex flex-col border border-purple-200">
          <div className="flex justify-between items-center p-3 bg-purple-600 text-white rounded-t-lg">
            <span className="font-bold">Chatbot</span>
            <button onClick={() => setOpen(false)}>✖</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={bubbleClass(msg)}>
                {msg.content}
              </div>
            ))}
            {loading && <div className="text-gray-500 text-xs px-2">Bot is typing...</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask me something..."
              className="flex-1 border rounded px-2 py-1 text-black"
            />
            <button
              onClick={sendMessage}
              className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors"
              disabled={loading}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}