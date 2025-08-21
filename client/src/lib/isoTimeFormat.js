// const isoTimeFormat = (dateTime) => {
//     const date = new Date(dateTime);
//     const localTime = date.toLocaleTimeString('en-Us', {
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: true,
//     })
//     return localTime
// }

// // export default isoTimeFormat ;

// const isoTimeFormat = (timeStr) => {
//   const [h, m] = timeStr.split(':');
//   let hour = parseInt(h, 10);
//   const minute = m.padStart(2, '0');
//   const ampm = hour >= 12 ? 'PM' : 'AM';
//   if (hour > 12) hour -= 12;
//   if (hour === 0) hour = 12;
//   return `${hour}:${minute} ${ampm}`;
// };

// export default isoTimeFormat;

const isoTimeFormatIST = (timeStr) => {
  const [h, m] = timeStr.split(':');
  const date = new Date();

  // Treat input as UTC time
  date.setUTCHours(parseInt(h, 10), parseInt(m, 10), 0, 0);

  // Convert to IST explicitly
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',  // IST (UTC+5:30)
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export default isoTimeFormatIST;

