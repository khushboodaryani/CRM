// src/components/routes/Afirst/Afirst.js

import React from "react";
import "./Afirst.css";
import Header from "../Other/Header/Header";
import ZForm from "../Forms/ZForm";

const Afirst = () => {
    return (
        <div className="everything">
            <div className="main-first">
                <Header />
            </div>
            <div className="main-second">
                <div className="second-form">
                    <ZForm />
                </div>
            </div>
        </div>
    );
};

export default Afirst;
