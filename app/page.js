import Image from "next/image";
import logo from "../public/logo-white.png";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2.5rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <Image
        src={logo}
        alt="Couch Cinema Collective"
        priority
        style={{ width: "min(320px, 70vw)", height: "auto" }}
      />

      <div style={{ width: "3rem", height: "3px", background: "var(--red)" }} />

      <p
        style={{
          fontSize: "0.85rem",
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          opacity: 0.85,
        }}
      >
        Season One Is Coming
      </p>
    </main>
  );
}
