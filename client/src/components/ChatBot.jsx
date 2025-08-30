// import { useState, useRef, useEffect } from "react";

// function generateSessionId() {
//   // Simple client-side fallback id
//   return (
//     window.localStorage.getItem("chat_session_id") ||
//     Math.random().toString(36).slice(2, 10)
//   );
// }

// export default function ChatBot() {
//   const [open, setOpen] = useState(false);
//   const [messages, setMessages] = useState([
//     {
//       sender: "bot",
//       content:
//         "Hi! I can help you with movies, showtimes, and bookings. Ask me about currently playing movies to get started.",
//     },
//   ]);
//   const [input, setInput] = useState("");
//   const [loading, setLoading] = useState(false);
//   const messagesEndRef = useRef(null);

//   const baseUrl = (import.meta.env.VITE_BASE_URL || "").replace(/\/$/, "");
//   // Keep a sessionId in localStorage
//   const [sessionId, setSessionId] = useState(() => {
//     const existing = localStorage.getItem("chat_session_id");
//     if (existing) return existing;
//     const id = generateSessionId();
//     localStorage.setItem("chat_session_id", id);
//     return id;
//   });

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   const pushMessage = (msg) => setMessages((prev) => [...prev, msg]);

//   const sendMessage = async () => {
//     const text = input.trim();
//     if (!text) return;
//     pushMessage({ sender: "user", content: text });
//     setInput("");
//     setLoading(true);

//     try {
//       const res = await fetch(`${baseUrl}/api/chat/ask`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ question: text, sessionId }),
//       });
//       const data = await res.json();

//       // Save sessionId if returned/updated by server
//       if (data.sessionId) {
//         localStorage.setItem("chat_session_id", data.sessionId);
//         setSessionId(data.sessionId);
//       }

//       // Render structured responses
//       if (data.type === "movies" && data.movies) {
//         // show mini cards (no Buy Ticket button)
//         pushMessage({ sender: "bot", content: data.answer });
//         data.movies.forEach((m) => {
//           pushMessage({
//             sender: "bot",
//             content: (
//               <div className="flex gap-2 items-start">
//                 <img
//                   src={m.poster || "/fallback-poster.jpg"}
//                   alt={m.title}
//                   className="w-16 h-24 object-cover rounded"
//                 />
//                 <div>
//                   <p className="font-bold">{m.title}</p>
//                   <p className="text-sm">Showtime: {new Date(m.showDateTime).toLocaleString()}</p>
//                   <p className="text-xs">Rating: {m.rating} ⭐ | Runtime: {m.runtime} mins</p>
//                   <p className="text-xs mt-1">To book: type <code>book ticket for {m.title}</code> or reply with <code>show {m.id}</code></p>
//                 </div>
//               </div>
//             ),
//           });
//         });
//       } else if (data.type === "movieInfo" && data.movie) {
//         const m = data.movie;
//         pushMessage({ sender: "bot", content: data.answer });
//         pushMessage({
//           sender: "bot",
//           content: (
//             <div className="flex gap-2 items-start">
//               <img src={m.poster || "/fallback-poster.jpg"} alt={m.title} className="w-20 h-28 object-cover rounded" />
//               <div>
//                 <p className="font-bold text-lg">{m.title}</p>
//                 <p className="text-sm">Rating: {m.rating} ⭐ | Runtime: {m.runtime} mins</p>
//                 {m.showDateTime && <p className="text-sm">Next show: {new Date(m.showDateTime).toLocaleString()}</p>}
//                 <p className="mt-1 text-sm">{m.overview}</p>
//                 <p className="mt-1 text-sm whitespace-pre-line">{data.guide}</p>
//                 <p className="mt-2 text-xs">To start booking in chat: <code>book ticket for {m.title}</code></p>
//               </div>
//             </div>
//           ),
//         });
//       } else if (data.type === "seatInfo") {
//         pushMessage({ sender: "bot", content: data.answer });
//         if (data.showId) {
//           pushMessage({
//             sender: "bot",
//             content: `To book these seats, reply with the seat numbers (comma-separated) after picking the show: e.g. "A1,A2". If you want to start booking the show directly, type "show ${data.showId}".`,
//           });
//         }
//       } else if (data.type === "bookingStep") {
//         // server returned bookingUrl + instructions
//         pushMessage({ sender: "bot", content: data.answer });
//         if (data.bookingUrl) {
//           pushMessage({
//             sender: "bot",
//             content: (
//               <div>
//                 <a
//                   href={data.bookingUrl}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="text-white bg-blue-600 px-3 py-1 rounded inline-block"
//                 >
//                   Open booking page to complete payment
//                 </a>
//                 <p className="text-xs mt-2">After completing payment, reply "confirm" in this chat.</p>
//               </div>
//             ),
//           });
//         }
//       } else {
//         // fallback text responses
//         pushMessage({ sender: "bot", content: data.answer || "Sorry, I didn't understand that." });
//       }
//     } catch (err) {
//       console.error(err);
//       pushMessage({ sender: "bot", content: "Error reaching server. Please try again." });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const bubbleClass = (msg) =>
//     `p-2 rounded-lg max-w-[80%] text-sm text-black ${
//       msg.sender === "bot" ? "bg-gray-200 self-start" : "bg-blue-200 self-end ml-auto"
//     }`;

//   return (
//     <div>
//       {!open && (
//         <button
//           onClick={() => setOpen(true)}
//           className="fixed bottom-5 right-5 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700"
//         >
//           💬
//         </button>
//       )}
//       {open && (
//         <div className="fixed bottom-5 right-5 w-96 h-[500px] bg-white shadow-xl rounded-lg flex flex-col border">
//           <div className="flex justify-between items-center p-3 bg-blue-600 text-white rounded-t-lg">
//             <span>Assistant</span>
//             <button onClick={() => setOpen(false)}>✖</button>
//           </div>

//           {/* Messages */}
//           <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
//             {messages.map((msg, idx) => (
//               <div key={idx} className={bubbleClass(msg)}>
//                 {msg.content}
//               </div>
//             ))}
//             {loading && <div className="text-gray-500 text-xs">Bot is typing...</div>}
//             <div ref={messagesEndRef} />
//           </div>

//           {/* Input */}
//           <div className="p-2 border-t flex gap-2">
//             <input
//               type="text"
//               value={input}
//               onChange={(e) => setInput(e.target.value)}
//               onKeyDown={(e) => e.key === "Enter" && sendMessage()}
//               placeholder="Ask about movies, showtimes, or 'book ticket for <title>'..."
//               className="flex-1 border rounded px-2 py-1 text-black"
//             />
//             <button onClick={sendMessage} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
//               Send
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

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

      // Render structured responses based on type
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
        // Seat info response is now purely informational
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