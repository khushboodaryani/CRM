// src/components/routes/Forms/ZForm.js

import React from "react";
import { Routes, Route, useParams } from 'react-router-dom';
import SearchForm from "./SearchForm/SearchForm";
import UseForm from "./UseForm/UseForm";
import ListForm from "./ListForm/ListForm";
import LastChanges from "./LastChange/LastChange";
import Login from "../Sign/Login/Login";
import Register from "../Sign/Register/Register";
import Logout from "../Sign/Logout/Logout";
import CreateForm from "./CreateForm/CreateForm";
import UploadNew from "../Other/Header/Upload/UploadNew";
import Reminder from "../Other/Reminder/Reminder";
import ForgotPassword from "../Sign/ForgotPassword/ForgotPassword";
import ResetPassword from "../Sign/ResetPassword/ResetPassword";
import DownloadFile from "../Other/Header/Download/DownloadFile";
import ApproveUser from "../Sign/ApproveUser/ApproveUser";
import AdminPortal from "./AdminPortal/AdminPortal";
import AdminGuard from "../../guards/AdminGuard";
import RequireAuth from '../../guards/RequireAuth';
import SuperAdminDashboard from '../../SuperAdmin/Dashboard';
import FormCreation from "./FormCreation/FormCreation";

const ZForm = () => {
    return (
        <Routes>

            {/* Super Admin Dashboard */}
            <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />

            {/* Admin Portal - Protected by AdminGuard */}
            <Route path="/admin" element={<AdminGuard><AdminPortal /></AdminGuard>} />

            {/* Dynamic Form Creation - Business Heads only */}
            <Route path="/form-creation" element={<AdminGuard><FormCreation /></AdminGuard>} />

            {/* List all customers */}
            <Route path="/customers" element={<ListForm />} />

            {/* Search for a customer */}
            <Route path="/customers/search" element={<SearchForm />} />

            {/* Use customer form by phone number */}
            <Route path="/customers/phone/:phone_no" element={<UseForm />} />

            {/* Use customer form by ID */}
            <Route path="/customers/:id" element={<UseForm />} />

            {/* Create a new customer record */}
            <Route path="/customer/new/:phone_no" element={<CreateForm />} />

            {/* Create a new customer record */}
            <Route path="/customer/new" element={<CreateForm />} />

            {/* Log customer changes, passing customerId as a prop */}
            <Route path="/customers/log-change/:id" element={<LastChangeWrapper />} />

            {/* Use customer form by phone number */}
            <Route path="/customers/phone/:phone_no/updates/" element={<LastChangeWrapper />} />

            {/* Upload and Download routes - Protected */}
            <Route
                path="/upload"
                element={
                    <RequireAuth>
                        <UploadNew />
                    </RequireAuth>
                }
            />
            <Route
                path="/download"
                element={
                    <RequireAuth>
                        <DownloadFile />
                    </RequireAuth>
                }
            />

            {/* Access call reminders */}
            <Route path="/customers/reminders" element={<Reminder />} />


            {/* Register a new user
            <Route path="/register" element={<Register />} /> */}

            {/* Login route */}
            <Route path="/login" element={<Login />} />

            {/* Logout route */}
            <Route path="/logout" element={<Logout />} />

            {/* Forgot password route */}
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Reset password route - updated to include both id and token */}
            <Route path="/reset-password/:id/:token" element={<ResetPassword />} />

            {/* Approve user route */}
            <Route path="/approve-user/:token" element={<ApproveUser />} />
            {/* ********************************* */}
        </Routes>
    );
};

// Wrapper component to extract the customerId from the URL and pass it to LastChanges
const LastChangeWrapper = () => {
    const { id } = useParams();
    console.log("Customer ID from URL:", id);
    return <LastChanges customerId={id} />;
};



export default ZForm;