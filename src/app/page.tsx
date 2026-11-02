export default function HomePage() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100dvh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      <iframe
        src="/Interhub/index.html"
        title="InternHub"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
      />
    </main>
  );
}
