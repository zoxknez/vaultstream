const DeviceStatusOverlay = ({ deviceStatus }) => {
  if (!deviceStatus || deviceStatus.level === 'success') {
    return null;
  }

  return (
    <div className="device-status-overlay">
      <div className="device-status-content">
        <h3>Device Status</h3>
        <div className="device-status-body">
          {deviceStatus.errors?.map((statusError, index) => (
            <div key={`status-error-${index}`} className="status-error">
              {statusError}
            </div>
          ))}
          {deviceStatus.warnings?.map((warning, index) => (
            <div key={`status-warning-${index}`} className="status-warning">
              {warning}
            </div>
          ))}
          {deviceStatus.recommendations?.map((recommendation, index) => (
            <div key={`status-recommendation-${index}`} className="status-recommendation">
              {recommendation}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeviceStatusOverlay;
