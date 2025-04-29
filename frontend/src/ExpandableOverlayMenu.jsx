import React, { useState } from 'react';
import './css/ExpandableMenuOverlay.css';

const ExpandableOverlayMenu = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Toggle menu open/closed
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="overlay-menu-container">
      {/* Menu toggle button */}
      <button 
        className={`menu-toggle ${isOpen ? 'active' : ''}`} 
        onClick={toggleMenu}
        aria-label="Toggle overlay menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 6C13.1046 6 14 5.10457 14 4C14 2.89543 13.1046 2 12 2C10.8954 2 10 2.89543 10 4C10 5.10457 10.8954 6 12 6Z" fill="currentColor"/>
          <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" fill="currentColor"/>
          <path d="M12 22C13.1046 22 14 21.1046 14 20C14 18.8954 13.1046 18 12 18C10.8954 18 10 18.8954 10 20C10 21.1046 10.8954 22 12 22Z" fill="currentColor"/>
        </svg>
      </button>

      {/* Menu options container */}
      <div className={`menu-options ${isOpen ? 'open' : ''}`}>
        {/* Transform children into menu options with animation */}
        {React.Children.map(children, (child, index) => {
          return (
            <div className="menu-option" style={{ animationDelay: `${0.05 * (index + 1)}s` }}>
              {/* Clone the child component and modify its props */}
              {React.cloneElement(child, {
                className: `${child.props.className || ''} menu-item-with-icon`,
                onClick: (e) => {
                  // Call the original onClick if it exists
                  if (child.props.onClick) {
                    child.props.onClick(e);
                  }
                  // Close the menu after a short delay
                  setTimeout(() => setIsOpen(false), 300);
                },
                children: (
                  <>
                    <span className="menu-item-icon">{child.props.icon}</span>
                    <span className="menu-item-text">{child.props.children}</span>
                  </>
                )
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExpandableOverlayMenu;