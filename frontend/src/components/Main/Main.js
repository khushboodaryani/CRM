// src/components/Main/Main.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './Main.css';
import Afirst from '../routes/Afirst/Afirst';
import Landing from '../routes/Landing/Landing';
import { PopupProvider } from '../../context/PopupContext';
import Popup from '../routes/Other/Popup/Popup';

// PopupWrapper component to render the Popup
const PopupWrapper = () => {
    return <Popup />;
};

const Main = () => {
    return (
        <Router>
            <PopupProvider>
                {/* Render Popup component */}
                <PopupWrapper />
                
                {/* Main content */}
                <div className="main-content">
                    <Routes>
                        {/* Route to the Landing component at the root path */}
                        <Route path="/" element={<Landing />} />

                        {/* Add a route for the Afirst component */}
                        <Route path="*" element={<Afirst />} />
                    </Routes>
                </div>
            </PopupProvider>
        </Router>
    );
};

export default Main;
