// src/components/routes/Landing/Landing.js

import React from "react";
import { Link } from "react-router-dom";
import "./Landing.css";

const Landing = () => {
    return (
        <div className="landing-container">
            <div className="landing-header">
                <img 
                    src="/uploads/logo.webp"
                    className="logo-landing"
                    alt="logo-landing"
                    aria-label="Logo"
                />
            </div>
            <div className="landing-content">
                <h2 className="landing-heading">Welcome to KnowledgeHouse CRM</h2>
                <Link to="/login" className="continue-link">
                    Click to continue
                </Link>
            </div>
        </div>
    );
}

export default Landing;
