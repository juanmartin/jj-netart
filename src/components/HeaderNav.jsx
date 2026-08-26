import React from 'react';

export default function HeaderNav({ uiVisible }) {
  return (
    <nav className={`header-nav${!uiVisible ? ' hidden' : ''}`}>
      <a className="nav-title" href="#">
        NET ART
      </a>
      <div className="nav-links">
        <a className="nav-link" href="#">
          MANDAME TU CAPTURA
        </a>
      </div>
    </nav>
  );
}
