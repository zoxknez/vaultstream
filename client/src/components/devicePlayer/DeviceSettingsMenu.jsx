const DeviceSettingsMenu = ({ playbackRate, onPlaybackRateChange, settingsRef }) => (
  <div className="settings-menu" data-testid="settings-menu" ref={settingsRef}>
    <div className="settings-content">
      <h3>Settings</h3>

      <div className="setting-group">
        <label>Playback Speed</label>
        <select
          value={playbackRate}
          onChange={(event) => onPlaybackRateChange(parseFloat(event.target.value))}
        >
          <option value={0.5}>0.5x</option>
          <option value={0.75}>0.75x</option>
          <option value={1}>1x</option>
          <option value={1.25}>1.25x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
        </select>
      </div>

      <div className="setting-group">
        <label>Quality</label>
        <select>
          <option value="auto">Auto</option>
          <option value="720p">720p</option>
          <option value="1080p">1080p</option>
          <option value="4K">4K</option>
        </select>
      </div>

      <div className="setting-group">
        <label>Subtitles</label>
        <select>
          <option value="off">Off</option>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </div>
    </div>
  </div>
);

export default DeviceSettingsMenu;
