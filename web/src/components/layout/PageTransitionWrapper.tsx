export default function PageTransitionWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      {children}
    </div>
  );
}
