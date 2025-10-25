const DeviceErrorOverlay = ({ error, onDismiss }) => {
  if (!error) {
    return null;
  }

  return (
    <div className="error-overlay">
      <div className="error-content">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={onDismiss}>Close</button>
      </div>
    </div>
  );
};

export default DeviceErrorOverlay;
