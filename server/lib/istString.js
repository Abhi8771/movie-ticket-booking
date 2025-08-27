// server/lib/istString.js
export const toISTString = (showDate, showTime) => {
  const showDateObj = new Date(`${showDate}T${showTime}Z`);
  return showDateObj.toLocaleString("en-IN", {
    weekday: "short",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    timeZone: "Asia/Kolkata"
  });
};
export default toISTString;