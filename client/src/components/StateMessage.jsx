export default function StateMessage({ children, action }) {
  return (
    <div className="state-message">
      {children}
      {action}
    </div>
  );
}

