import React from 'react';
import PropTypes from 'prop-types';
import { SkipForward } from 'lucide-react';
import './SkipIntroButton.css';

const SkipIntroButton = ({ onSkip, visible = false }) => {
  if (!visible) return null;

  return (
    <button 
      className="skip-intro-button"
      onClick={onSkip}
      aria-label="Skip Intro"
    >
      <SkipForward size={20} />
      <span>Skip Intro</span>
    </button>
  );
};

SkipIntroButton.propTypes = {
  onSkip: PropTypes.func.isRequired,
  visible: PropTypes.bool
};

export default SkipIntroButton;
