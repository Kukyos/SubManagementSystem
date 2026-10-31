export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <div aria-hidden className="grain" />
    </>
  );
}
