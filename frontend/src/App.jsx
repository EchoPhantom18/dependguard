import { Navigate, Route, Routes } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";

import Layout from "./components/Layout.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import AttackGraph from "./pages/AttackGraph.jsx";
import CIIntegration from "./pages/CIIntegration.jsx";
import LicenseCompliance from "./pages/LicenseCompliance.jsx";
import Login from "./pages/Login.jsx";
import NewScan from "./pages/NewScan.jsx";
import OAuthSuccess from "./pages/OAuthSuccess.jsx";
import Reports from "./pages/Reports.jsx";
import ReportDetails from "./pages/ReportDetails.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import RepoScanner from "./pages/RepoScanner.jsx";
import SafeManifest from "./pages/SafeManifest.jsx";
import ScanHistory from "./pages/ScanHistory.jsx";
import ScanResults from "./pages/ScanResults.jsx";
import Settings from "./pages/Settings.jsx";
import Signup from "./pages/Signup.jsx";
import SupplyChainScore from "./pages/SupplyChainScore.jsx";
import VulnerabilityIntelligence from "./pages/VulnerabilityIntelligence.jsx";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new-scan" element={<NewScan />} />
          <Route path="/repo-scanner" element={<RepoScanner />} />
          <Route path="/scan-results/:scanId" element={<ScanResults />} />
          <Route path="/safe-manifest/:scanId?" element={<SafeManifest />} />
          <Route path="/attack-graph" element={<AttackGraph />} />
          <Route path="/attack-graph/:scanId" element={<AttackGraph />} />
          <Route path="/ci-cd" element={<CIIntegration />} />
          <Route path="/licenses" element={<LicenseCompliance />} />
          <Route path="/supply-chain" element={<SupplyChainScore />} />
          <Route path="/intelligence" element={<VulnerabilityIntelligence />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:scanId" element={<ReportDetails />} />
          <Route path="/history" element={<ScanHistory />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
