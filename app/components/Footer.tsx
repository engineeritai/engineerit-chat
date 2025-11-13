// app/components/Footer.tsx

export default function Footer() {
  return (
    <footer
      style={{
        padding: "24px",
        textAlign: "center",
        fontSize: "13px",
        color: "#777",
        marginTop: "40px",
      }}
    >
      <p>AI Engineering Assistant</p>

      <p style={{ marginTop: "6px" }}>
        © 2025 engineerit. All rights reserved.
      </p>

      <p style={{ marginTop: "6px" }}>
        engineerit may make mistakes. Always verify important information.
      </p>

      <p style={{ marginTop: "6px" }}>
        engineerit is not responsible or liable for any decisions you make
        based on its output.
      </p>
    </footer>
  );
}
