const BlurCircle = ({ top = "auto", left = "auto", right = "auto", bottom = "auto" }) => {
  return (
    <div
      className="absolute -z-50 w-58 h-58 aspect-square rounded-full blur-[100px]"
      style={{
        top,
        left,
        right,
        bottom,
        backgroundColor: "#8F00FF", 
        filter: "blur(100px) saturate(200%)",
        opacity: 0.8,
      }}
    ></div>
  );
};

export default BlurCircle;
