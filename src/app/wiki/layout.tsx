import { NativeRedirect } from "./native-redirect";

export default function WikiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NativeRedirect />
      {children}
    </>
  );
}
