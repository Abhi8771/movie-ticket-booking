// import { useState, useRef, useEffect } from "react";

// export default function ChatBot() {
//   const [open, setOpen] = useState(false);
//   const [messages, setMessages] = useState([
//     { sender: "bot", text: "Hi! How can I help you with bookings today?" }
//   ]);
//   const [input, setInput] = useState("");
//   const [loading, setLoading] = useState(false);
//   const messagesEndRef = useRef(null);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   const sendMessage = async () => {
//     if (!input.trim()) return;

//     const userMessage = { sender: "user", text: input };
//     setMessages(prev => [...prev, userMessage]);
//     setInput("");
//     setLoading(true);

//     try {
//       const baseUrl = (import.meta.env.VITE_BASE_URL || "").replace(/\/$/, "");
//       const res = await fetch(`${baseUrl}/api/chat/ask`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ question: input }),
//       });

//       const data = await res.json();
//       setMessages(prev => [
//         ...prev,
//         { sender: "bot", text: data.answer || "Something went wrong." }
//       ]);
//     } catch (err) {
//       console.error(err);
//       setMessages(prev => [
//         ...prev,
//         { sender: "bot", text: "Error reaching server." }
//       ]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div>
//       {!open && (
//         <button
//           onClick={() => setOpen(true)}
//           className="fixed bottom-5 right-5 bg-primary text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition"
//         >
//           💬
//         </button>
//       )}

//       {open && (
//         <div className="fixed bottom-5 right-5 w-80 h-96 bg-primary shadow-xl rounded-lg flex flex-col border">
//           <div className="flex justify-between items-center p-3 bg-primary-600 text-white rounded-t-lg">
//             <span>AI Assistant</span>
//             <button onClick={() => setOpen(false)}>✖</button>
//           </div>

//           <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
//             {messages.map((msg, index) => (
//               <div
//                 key={index}
//                 className={`p-2 rounded-lg max-w-[80%] text-black ${
//                   msg.sender === "bot"
//                     ? "bg-gray-200 self-start"
//                     : "bg-blue-200 self-end ml-auto"
//                 }`}
//               >
//                 {msg.text}
//               </div>
//             ))}
//             {loading && <div className="text-gray-500 text-sm">Bot is typing...</div>}
//             <div ref={messagesEndRef} />
//           </div>

//           <div className="p-2 border-t flex">
//             <input
//               type="text"
//               value={input}
//               onChange={e => setInput(e.target.value)}
//               onKeyDown={e => e.key === "Enter" && sendMessage()}
//               placeholder="Ask me anything..."
//               className="flex-1 border rounded px-2 py-1 text-black"
//             />
//             <button
//               onClick={sendMessage}
//               className="ml-2 bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
//             >
//               Send
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// import { useState, useRef, useEffect } from "react";

// export default function ChatBot() {
//   const [open, setOpen] = useState(false);
//   const [messages, setMessages] = useState([
//     { sender: "bot", type: "text", answer: "Hi! How can I help you with bookings today?" }
//   ]);
//   const [input, setInput] = useState("");
//   const [loading, setLoading] = useState(false);
//   const messagesEndRef = useRef(null);

//   const baseUrl = (import.meta.env.VITE_BASE_URL || "").replace(/\/$/, "");

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   const pushMessage = (msg) => setMessages((prev) => [...prev, msg]);

//   const sendMessage = async (overrideText) => {
//     const text = (overrideText ?? input).trim();
//     if (!text) return;

//     // show user's message
//     pushMessage({ sender: "user", type: "text", answer: text });
//     setInput("");
//     setLoading(true);

//     try {
//       const res = await fetch(`${baseUrl}/api/chat/ask`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ question: text }),
//       });
//       const data = await res.json();

//       // normalize for rendering: always have sender + type + answer
//       if (!data.type) data.type = "text";
//       if (!data.answer && data.text) data.answer = data.text;

//       pushMessage({ sender: "bot", ...data });
//     } catch (err) {
//       console.error(err);
//       pushMessage({ sender: "bot", type: "error", answer: "Error reaching server." });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Book a specific seat for a specific show
//   const handleSeatBooking = async (showId, seat) => {
//     const userName = window.prompt("Enter your name to confirm booking:") || "Guest";
//     if (!showId || !seat) return;

//     // Show user's intent
//     pushMessage({ sender: "user", type: "text", answer: `Book seat ${seat}` });

//     setLoading(true);
//     try {
//       const res = await fetch(`${baseUrl}/api/chat/book`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ showId, seats: [seat], userName }),
//       });
//       const data = await res.json();

//       if (data.success) {
//         // Confirmation message
//         pushMessage({ sender: "bot", type: "text", answer: data.message });

//         // Also show updated availability for that show
//         if (data.show) {
//           pushMessage({
//             sender: "bot",
//             type: "seats",
//             answer: `Updated availability for ${data.show.movie}:`,
//             seats: [
//               {
//                 id: data.show.id,
//                 movie: data.show.movie,
//                 time: data.show.time,
//                 price: data.show.price,
//                 availableSeats: data.show.availableSeats,
//               },
//             ],
//           });
//         }
//       } else {
//         pushMessage({ sender: "bot", type: "error", answer: data.message || "Booking failed." });
//       }
//     } catch (err) {
//       console.error(err);
//       pushMessage({ sender: "bot", type: "error", answer: "Booking failed due to a network/server error." });
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
//           className="fixed bottom-5 right-5 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition"
//           aria-label="Open chat"
//         >
//           💬
//         </button>
//       )}

//       {open && (
//         <div className="fixed bottom-5 right-5 w-80 h-96 bg-white shadow-xl rounded-lg flex flex-col border">
//           <div className="flex justify-between items-center p-3 bg-blue-600 text-white rounded-t-lg">
//             <span>AI Assistant</span>
//             <button onClick={() => setOpen(false)} aria-label="Close chat">✖</button>
//           </div>

//           <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
//             {messages.map((msg, idx) => {
//               // Render SEATS UI
//               if (msg.type === "seats" && Array.isArray(msg.seats)) {
//                 return (
//                   <div key={idx} className={bubbleClass({ sender: "bot" })}>
//                     <div className="font-semibold mb-1">{msg.answer || "Seat availability:"}</div>
//                     <div className="space-y-3">
//                       {msg.seats.map((show) => (
//                         <div key={`${show.id}-${show.time}`}>
//                           <div className="text-sm font-medium">
//                             {show.movie} — {new Date(show.time).toLocaleString()}
//                           </div>
//                           <div className="text-xs text-gray-600 mb-1">Price: ₹{show.price}</div>
//                           {show.availableSeats?.length ? (
//                             <div className="flex flex-wrap gap-2">
//                               {show.availableSeats.map((seat) => (
//                                 <button
//                                   key={seat}
//                                   onClick={() => handleSeatBooking(show.id, seat)}
//                                   className="px-2 py-1 rounded bg-green-200 hover:bg-green-300 text-xs"
//                                 >
//                                   {seat}
//                                 </button>
//                               ))}
//                             </div>
//                           ) : (
//                             <div className="text-xs text-red-600">No seats available.</div>
//                           )}
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 );
//               }

//               // Render MOVIES UI
//               if (msg.type === "movies" && Array.isArray(msg.movies)) {
//                 return (
//                   <div key={idx} className={bubbleClass({ sender: "bot" })}>
//                     <div className="font-semibold mb-1">{msg.answer || "Movies:"}</div>
//                     <ul className="list-disc pl-5 text-sm">
//                       {msg.movies.map((title, i) => (
//                         <li key={`${title}-${i}`}>{title}</li>
//                       ))}
//                     </ul>
//                   </div>
//                 );
//               }

//               // Default text/error
//               return (
//                 <div key={idx} className={bubbleClass(msg)}>
//                   {msg.answer || msg.text}
//                 </div>
//               );
//             })}

//             {loading && <div className="text-gray-500 text-xs">Bot is typing...</div>}
//             <div ref={messagesEndRef} />
//           </div>

//           <div className="p-2 border-t flex gap-2">
//             <input
//               type="text"
//               value={input}
//               onChange={(e) => setInput(e.target.value)}
//               onKeyDown={(e) => e.key === "Enter" && sendMessage()}
//               placeholder="Ask about seats, movies, etc."
//               className="flex-1 border rounded px-2 py-1 text-black"
//             />
//             <button
//               onClick={() => sendMessage()}
//               className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
//             >
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
    { sender: "bot", type: "text", answer: "Hi! How can I help you with bookings today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState({});
  const messagesEndRef = useRef(null);

  const baseUrl = (import.meta.env.VITE_BASE_URL || "").replace(/\/$/, "");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const pushMessage = (msg) => setMessages(prev => [...prev, msg]);

  // --- Send user question to AI ---
  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text) return;

    pushMessage({ sender: "user", type: "text", answer: text });
    setInput(""); setLoading(true);

    try {
      const res = await fetch(`${baseUrl}/api/chat/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();

      pushMessage({ sender: "bot", type: data.type || "text", ...data });
    } catch (err) {
      console.error(err);
      pushMessage({ sender: "bot", type: "error", answer: "Error reaching server." });
    } finally {
      setLoading(false);
    }
  };

  // --- Handle booking seats ---
  const handleSeatBooking = async (showId, seat) => {
    const userName = window.prompt("Enter your name:") || "Guest";
    const userEmail = window.prompt("Enter your email:") || "guest@example.com";

    const seatsToBook = selectedSeats[showId] || [seat];

    pushMessage({ sender: "user", type: "text", answer: `Book seat(s) ${seatsToBook.join(", ")}` });
    setLoading(true);

    try {
      const res = await fetch(`${baseUrl}/api/chat/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showId, seats: seatsToBook, userName, userEmail }),
      });
      const data = await res.json();

      if (data.success) {
        pushMessage({ sender: "bot", type: "text", answer: data.message });
        // Reset selected seats
        setSelectedSeats(prev => ({ ...prev, [showId]: [] }));
      } else {
        pushMessage({ sender: "bot", type: "error", answer: data.message || "Booking failed." });
      }
    } catch (err) {
      console.error(err);
      pushMessage({ sender: "bot", type: "error", answer: "Booking failed due to network/server error." });
    } finally {
      setLoading(false);
    }
  };

  // --- Handle seat selection (multi-seat support) ---
  const toggleSeat = (showId, seat) => {
    setSelectedSeats(prev => {
      const current = prev[showId] || [];
      const updated = current.includes(seat) ? current.filter(s => s !== seat) : [...current, seat];
      return { ...prev, [showId]: updated };
    });
  };

  // --- Bubble style ---
  const bubbleClass = (msg) =>
    `p-2 rounded-lg max-w-[80%] text-sm text-black ${
      msg.sender === "bot" ? "bg-gray-200 self-start" : "bg-blue-200 self-end ml-auto"
    }`;

  return (
    <div>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition"
          aria-label="Open chat"
        >
          💬
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 w-96 h-[500px] bg-white shadow-xl rounded-lg flex flex-col border">
          {/* Header */}
          <div className="flex justify-between items-center p-3 bg-blue-600 text-white rounded-t-lg">
            <span>AI Assistant</span>
            <button onClick={() => setOpen(false)} aria-label="Close chat">✖</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.map((msg, idx) => {
              // --- Seats UI ---
              if (msg.type === "seats" && Array.isArray(msg.seats)) {
                return (
                  <div key={idx} className={bubbleClass({ sender: "bot" })}>
                    <div className="font-semibold mb-1">{msg.answer || "Seat availability:"}</div>
                    {msg.seats.map(show => (
                      <div key={show.id} className="mb-2">
                        <div className="text-sm font-medium">{show.movie} — {new Date(show.showDateTime).toLocaleString()}</div>
                        <div className="text-xs text-gray-600 mb-1">Price: ₹{show.price}</div>
                        <div className="grid grid-cols-8 gap-1">
                          {show.availableSeats?.map(seat => (
                            <button
                              key={seat}
                              onClick={() => toggleSeat(show.id, seat)}
                              className={`px-2 py-1 rounded text-xs ${
                                selectedSeats[show.id]?.includes(seat) ? "bg-green-500 text-white" : "bg-green-200 hover:bg-green-300"
                              }`}
                            >
                              {seat}
                            </button>
                          ))}
                        </div>
                        {selectedSeats[show.id]?.length > 0 && (
                          <button
                            onClick={() => handleSeatBooking(show.id)}
                            className="mt-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                          >
                            Book Selected Seats
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              }

              // --- Movies UI ---
              if (msg.type === "movies" && Array.isArray(msg.movies)) {
                return (
                  <div key={idx} className={bubbleClass({ sender: "bot" })}>
                    <div className="font-semibold mb-1">{msg.answer || "Movies:"}</div>
                    {msg.movies.map(movie => (
                      <div key={movie.id} className="flex gap-2 mb-2 border rounded p-1">
                        <img src={movie.poster} alt={movie.title} className="w-16 h-20 object-cover rounded" />
                        <div className="text-xs">
                          <div className="font-semibold">{movie.title}</div>
                          <div>{movie.overview.slice(0, 60)}...</div>
                          <div>Rating: {movie.rating} | {movie.runtime} min</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              // --- Default text ---
              return <div key={idx} className={bubbleClass(msg)}>{msg.answer || msg.text}</div>;
            })}

            {loading && <div className="text-gray-500 text-xs">Bot is typing...</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about seats, movies, etc."
              className="flex-1 border rounded px-2 py-1 text-black"
            />
            <button
              onClick={() => sendMessage()}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
