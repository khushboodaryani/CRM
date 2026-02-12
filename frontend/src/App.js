// src/App.js


import React from 'react';
import './App.css';
import Main from './components/Main/Main';
import UCP from './components/routes/Other/UCP/UCP';

function App() {
  // Determine if user is logged in (using the same approach as in your existing authentication system)
  const isLoggedIn = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  return (
      <div className="App">
        <Main />
        <UCP isLoggedIn={isLoggedIn} />
      </div>
  );
}

export default App;