import {
  AlertTriangle,
  Archive,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  CircleDot,
  Clock3,
  Download,
  Edit3,
  FileQuestion,
  LifeBuoy,
  ListFilter,
  Plus,
  BarChart3,
  BookOpen,
  LayoutDashboard,
  Monitor,
  RefreshCcw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  UserRoundX,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent as ReactFormEvent, ReactNode } from "react";

import {
  ApiError,
  addSystemTag,
  archiveDirectoryRecord,
  archiveSystem,
  archiveVendor,
  createDirectoryRecord,
  createSystem,
  createVendor,
  deleteSystem,
  fetchActivity,
  fetchAssetTypes,
  fetchCurrentUser,
  fetchDashboardTotals,
  fetchDirectoryRecord,
  fetchDirectoryRecords,
  fetchReport,
  fetchReportSummaries,
  fetchSystem,
  fetchSystemCategoryDetails,
  fetchSystemDependencies,
  fetchSystemTags,
  fetchSystems,
  fetchVendor,
  fetchVendors,
  importSystemsCsv,
  importVendorsCsv,
  loginWithRemember,
  logout,
  requestPasswordReset,
  resetPassword,
  signUp,
  updateDirectoryRecord,
  updateProfile,
  updateSystem,
  updateSystemCategoryDetails,
  updateVendor,
  removeSystemTag
} from "./api";
import { getRecordHref, getStatusCount, statusLabels } from "./dashboardData";
import type {
  AssetType,
  AuditLogEvent,
  AuthUser,
  CategoryDetails,
  DashboardTotals,
  DirectoryRecord,
  DirectoryResource,
  SystemRecord,
  SystemDependency,
  SystemDependencySummary,
  SystemRecordFormInput,
  SystemRecordWarning,
  SystemReport,
  SystemReportKey,
  SystemReportSummary,
  SystemStatus,
  Vendor,
  VendorFormInput
} from "./types";

type LoadState = "loading" | "ready" | "error";
const supportTicketUrl =
  import.meta.env?.VITE_SUPPORT_TICKET_URL ?? "https://firstgx.mypresswise.com/support/ticket.php";
export type Route =
  | { name: "dashboard" }
  | { name: "help" }
  | { name: "resetPassword"; query: URLSearchParams }
  | { name: "updates" }
  | { name: "profile" }
  | { name: "reports"; query: URLSearchParams }
  | { name: "systems"; query: URLSearchParams }
  | { name: "systemDetail"; id: number }
  | { name: "newSystem" }
  | { name: "editSystem"; id: number }
  | { name: "vendors"; query: URLSearchParams }
  | { name: "vendorDetail"; id: number }
  | { name: "newVendor" }
  | { name: "editVendor"; id: number }
  | { name: "directoryHome" }
  | { name: "directoryList"; resource: DirectoryResource; query: URLSearchParams }
  | { name: "directoryDetail"; resource: DirectoryResource; id: number }
  | { name: "directoryNew"; resource: DirectoryResource }
  | { name: "directoryEdit"; resource: DirectoryResource; id: number };

const systemStatuses = Object.keys(statusLabels) as SystemStatus[];
const sortOptions = [
  { value: "systemName", label: "System name" },
  { value: "category", label: "Category" },
  { value: "status", label: "Status" },
  { value: "technicalOwner", label: "Technical owner" },
  { value: "vendor", label: "Vendor" },
  { value: "lastReviewDate", label: "Last review date" },
  { value: "updatedAt", label: "Recently updated" }
];
const reportKeys: SystemReportKey[] = [
  "data-quality",
  "missing-documentation",
  "missing-owners",
  "upcoming-renewals",
  "active-systems",
  "being-replaced",
  "retired-systems",
  "by-vendor",
  "by-category",
  "by-owner",
  "by-criticality",
  "by-lifecycle",
  "review-due",
  "recently-reviewed"
];
const reportOptions = reportKeys.map((key) => ({
  key,
  label: reportLabel(key)
}));
type DirectoryField = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "select" | "number" | "date" | "datetime-local";
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  systemSelect?: boolean;
};

const directoryConfigs: Record<
  DirectoryResource,
  { title: string; singular: string; fields: DirectoryField[]; summaryFields: string[] }
> = {
  integrations: {
    title: "Integrations",
    singular: "Integration",
    summaryFields: ["name", "source_asset_id", "target_asset_id", "criticality"],
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "source_asset_id", label: "Source system", systemSelect: true },
      { name: "target_asset_id", label: "Target system", systemSelect: true },
      { name: "source_external_name", label: "Source external name" },
      { name: "target_external_name", label: "Target external name" },
      { name: "integration_type", label: "Integration type" },
      { name: "direction", label: "Direction", type: "select", options: optionValues(["inbound", "outbound", "bidirectional"]) },
      { name: "protocol", label: "Protocol" },
      { name: "data_description", label: "Data description", type: "textarea" },
      { name: "schedule_description", label: "Schedule description", type: "textarea" },
      { name: "criticality", label: "Criticality", type: "select", options: optionValues(["low", "medium", "high", "critical"]) },
      { name: "documentation_url", label: "Documentation URL" },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  "scheduled-processes": {
    title: "Scheduled Processes",
    singular: "Scheduled Process",
    summaryFields: ["name", "asset_id", "schedule_kind", "lifecycle_status"],
    fields: [
      { name: "asset_id", label: "Related system", systemSelect: true },
      { name: "name", label: "Name", required: true },
      { name: "schedule_kind", label: "Schedule kind", type: "select", options: optionValues(["cron", "fixed_interval", "manual", "event_driven", "other"]) },
      { name: "schedule_expression", label: "Schedule expression" },
      { name: "schedule_timezone", label: "Schedule timezone" },
      { name: "command_or_job_name", label: "Command or job name" },
      { name: "run_location_asset_id", label: "Run location system", systemSelect: true },
      { name: "failure_notification_channel", label: "Failure notification channel" },
      { name: "runbook_url", label: "Runbook URL" },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  reviews: {
    title: "Reviews",
    singular: "Review",
    summaryFields: ["asset_id", "reviewed_at", "review_status", "next_review_due_at"],
    fields: [
      { name: "asset_id", label: "Related system", systemSelect: true, required: true },
      { name: "reviewed_at", label: "Reviewed at", type: "datetime-local" },
      { name: "review_status", label: "Review status", type: "select", options: optionValues(["approved", "needs_updates", "retirement_candidate"]) },
      { name: "next_review_due_at", label: "Next review due", type: "date" },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  tags: {
    title: "Tags",
    singular: "Tag",
    summaryFields: ["name", "description"],
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "description", label: "Description", type: "textarea" }
    ]
  },
  "system-dependencies": {
    title: "System Dependencies",
    singular: "System Dependency",
    summaryFields: ["source_asset_id", "destination_asset_id", "importance_level"],
    fields: dependencyFields()
  },
  "document-references": {
    title: "Document References",
    singular: "Document Reference",
    summaryFields: ["title", "asset_id", "document_type"],
    fields: [
      { name: "asset_id", label: "Related system", systemSelect: true },
      { name: "title", label: "Title", required: true },
      { name: "url", label: "Document URL", required: true },
      { name: "document_type", label: "Document type" },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  "custom-fields": {
    title: "Custom Fields",
    singular: "Custom Field",
    summaryFields: ["label", "field_key", "field_type"],
    fields: [
      { name: "asset_type_id", label: "Asset type", type: "number" },
      { name: "field_key", label: "Field key", required: true },
      { name: "label", label: "Label", required: true },
      { name: "field_type", label: "Field type", type: "select", options: optionValues(["text", "textarea", "number", "date", "url"]), required: true },
      { name: "required", label: "Required", type: "select", options: [{ value: "0", label: "No" }, { value: "1", label: "Yes" }] },
      { name: "help_text", label: "Help text", type: "textarea" }
    ]
  }
};

export function DashboardApp() {
  const [route, setRoute] = useState<Route>(() => parseRoute());
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const updateRoute = () => setRoute(parseRoute());
    window.addEventListener("hashchange", updateRoute);

    return () => window.removeEventListener("hashchange", updateRoute);
  }, []);

  useEffect(() => {
    void fetchCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        return fetchAssetTypes();
      })
      .then(setAssetTypes)
      .catch((error) => {
        if (error instanceof ApiError) {
          setUser(null);
          return;
        }

        console.error(error);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  function navigate(hash: string) {
    window.location.hash = hash;
  }

  function signIn(currentUser: AuthUser) {
    setUser(currentUser);
    void fetchAssetTypes()
      .then(setAssetTypes)
      .catch((error) => console.error(error));
  }

  async function signOut() {
    await logout();
    setUser(null);
    setAssetTypes([]);
  }

  if (!authChecked) {
    return (
      <main className="app-shell">
        <section className="notice">Loading Technology Operations Directory...</section>
      </main>
    );
  }

  if (!user && route.name === "resetPassword") {
    return <ResetPasswordPage query={route.query} />;
  }

  if (!user) {
    return <LoginScreen onAuthenticated={signIn} />;
  }

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <a className="brand-mark" href="#">
          <span className="brand-monitor" aria-hidden="true">
            <Monitor size={38} />
            <PrismaPLogo />
          </span>
          <strong>Technology Department</strong>
        </a>
        <nav className="side-nav" aria-label="Primary">
          <SidebarLink href="#" label="Dashboard" active={route.name === "dashboard"} icon={<LayoutDashboard size={20} />} />
          <SidebarLink href="#/updates" label="Updates" active={route.name === "updates"} icon={<Clock3 size={20} />} />
          <SidebarLink href="#/systems" label="Systems" active={route.name.startsWith("system") || route.name === "systems"} icon={<Monitor size={20} />} />
          <SidebarLink href="#/vendors" label="Vendors" active={route.name.startsWith("vendor") || route.name === "vendors"} icon={<UserRoundX size={20} />} />
          <SidebarLink href="#/directory" label="Directory" active={route.name.startsWith("directory")} icon={<BookOpen size={20} />} />
          <SidebarLink href="#/reports" label="Reports" active={route.name === "reports"} icon={<BarChart3 size={20} />} />
        </nav>
        <div className="sidebar-user">
          <a className="profile-link" href="#/profile">
            {user.profile_image_data ? (
              <img className="avatar-image" alt="" src={user.profile_image_data} />
            ) : (
              <span className="avatar">{user.display_name.slice(0, 1).toUpperCase()}</span>
            )}
          </a>
          <span>
            <a className="profile-name" href="#/profile">{user.display_name}</a>
            <button type="button" onClick={() => void signOut()}>
              Sign out
            </button>
          </span>
        </div>
      </aside>

      <section className="app-shell">
        <header className="dashboard-header">
          <h1>Technology Operations Directory</h1>
          {route.name === "dashboard" ? (
            <div className="header-actions">
              <a className="primary-link" href="#/systems/new">
                <Plus size={16} aria-hidden="true" />
                Add System
              </a>
              <SupportTicketLink />
              <a className="icon-button square" href="#/help" aria-label="Open user guide" title="User guide">
                <CircleHelp size={20} aria-hidden="true" />
              </a>
            </div>
          ) : null}
        </header>

      {route.name === "dashboard" ? <DashboardHome navigate={navigate} /> : null}
      {route.name === "help" ? <HelpPage /> : null}
      {route.name === "updates" ? <UpdatesPage /> : null}
      {route.name === "profile" ? <ProfileSettingsPage user={user} onUserUpdated={setUser} /> : null}
      {route.name === "reports" ? <ReportsPage initialQuery={route.query} /> : null}
      {route.name === "systems" ? (
        <SystemsList assetTypes={assetTypes} initialQuery={route.query} navigate={navigate} />
      ) : null}
      {route.name === "systemDetail" ? (
        <SystemDetail id={route.id} assetTypes={assetTypes} navigate={navigate} />
      ) : null}
      {route.name === "newSystem" ? (
        <SystemForm assetTypes={assetTypes} mode="create" navigate={navigate} />
      ) : null}
      {route.name === "editSystem" ? (
        <SystemForm assetTypes={assetTypes} mode="edit" systemId={route.id} navigate={navigate} />
      ) : null}
      {route.name === "vendors" ? <VendorsList initialQuery={route.query} /> : null}
      {route.name === "vendorDetail" ? <VendorDetail id={route.id} navigate={navigate} /> : null}
      {route.name === "newVendor" ? <VendorForm mode="create" navigate={navigate} /> : null}
      {route.name === "editVendor" ? (
        <VendorForm mode="edit" vendorId={route.id} navigate={navigate} />
      ) : null}
      {route.name === "directoryHome" ? <DirectoryHome /> : null}
      {route.name === "directoryList" ? (
        <DirectoryList resource={route.resource} initialQuery={route.query} />
      ) : null}
      {route.name === "directoryDetail" ? (
        <DirectoryDetail resource={route.resource} id={route.id} navigate={navigate} />
      ) : null}
      {route.name === "directoryNew" ? (
        <DirectoryForm resource={route.resource} mode="create" navigate={navigate} />
      ) : null}
      {route.name === "directoryEdit" ? (
        <DirectoryForm resource={route.resource} mode="edit" id={route.id} navigate={navigate} />
      ) : null}
      </section>
    </main>
  );
}

function SidebarLink({
  href,
  label,
  icon,
  active
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
}) {
  return (
    <a className={`side-nav-link ${active ? "active" : ""}`} href={href}>
      {icon}
      {label}
    </a>
  );
}

function SupportTicketLink() {
  return (
    <a className="secondary-link" href={supportTicketUrl} rel="noreferrer" target="_blank">
      <LifeBuoy size={16} aria-hidden="true" />
      Support
    </a>
  );
}

function PrismaPLogo() {
  return (
    <svg className="prisma-p-logo" viewBox="0 0 28 34" aria-hidden="true">
      <path fill="#00a9e0" d="M0 8h8v9H0z" />
      <path fill="#40c4f4" d="M0 17h8v9H0z" />
      <path fill="#00a9e0" d="M0 26h8v8H0z" />
      <path fill="#95c93d" d="M8 0h10v8H8z" />
      <path fill="#00a9e0" d="M8 8h10v9H8z" />
      <path fill="#48c7ee" d="M8 17h10v9H8z" />
      <path fill="#f7941d" d="M18 0h10v8H18z" />
      <path fill="#ffcb05" d="M18 8h10v9H18z" />
      <path fill="#f15a24" d="M18 17h10v9H18z" />
      <path fill="#003da5" d="M8 26h10v8H8z" />
    </svg>
  );
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitLogin(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);

    try {
      if (mode === "signup") {
        await signUp({ displayName, email, password, phone, jobTitle });
        setInfo("Account created. You can log in now.");
        setMode("login");
        return;
      }

      if (mode === "forgot") {
        const response = await requestPasswordReset(email);
        setInfo(response.data.message);
        setMode("login");
        return;
      }

      const response = await loginWithRemember(email, password, remember);
      onAuthenticated(response.data);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="login-panel">
        <h1>{mode === "signup" ? "Sign up with us" : mode === "forgot" ? "Reset your password" : "Log in to support portal"}</h1>
        <p className="login-subtitle">
          {mode === "login" ? (
            <>
              Are you a new user?{" "}
              <button type="button" onClick={() => setMode("signup")}>
                Sign up with us
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setMode("login")}>
              Back to login
            </button>
          )}
        </p>
        <form className="login-form" onSubmit={(event) => void submitLogin(event)}>
          {error ? (
            <section className="notice error" role="alert">
              {error}
            </section>
          ) : null}
          {info ? <section className="notice success">{info}</section> : null}
          {mode === "signup" ? (
            <label>
              Full name <span aria-hidden="true">*</span>
              <input
                autoComplete="name"
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Full name"
                required
                value={displayName}
              />
            </label>
          ) : null}
          <label>
            Your e-mail address <span aria-hidden="true">*</span>
            <input
              autoComplete="username"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Your e-mail address"
              required
              type="email"
              value={email}
            />
          </label>
          {mode !== "forgot" ? (
            <label>
              Password <span aria-hidden="true">*</span>
              <input
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                required
                type="password"
                value={password}
              />
            </label>
          ) : null}
          {mode === "signup" ? (
            <>
              <label>
                Phone number
                <input onChange={(event) => setPhone(event.target.value)} placeholder="Phone number" value={phone} />
              </label>
              <label>
                Job title
                <input onChange={(event) => setJobTitle(event.target.value)} placeholder="Job title" value={jobTitle} />
              </label>
            </>
          ) : null}
          {mode === "login" ? (
            <label className="remember-row">
              <input
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                type="checkbox"
              />
              Remember me on this computer
            </label>
          ) : null}
          <button className="primary-link" disabled={submitting} type="submit">
            {submitting ? "Working..." : mode === "signup" ? "Create account" : mode === "forgot" ? "Reset password" : "Login"}
          </button>
          {mode === "login" ? (
            <button className="forgot-link" type="button" onClick={() => setMode("forgot")}>
              Forgot your password?
            </button>
          ) : null}
        </form>
      </section>
    </main>
  );
}

function ResetPasswordPage({ query }: { query: URLSearchParams }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const token = query.get("token") ?? "";

  async function savePassword(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await resetPassword(token, password);
      setMessage(response.data.message);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reset password.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="login-panel">
        <h1>Set a new password</h1>
        {!token ? (
          <section className="notice error">Password reset link is missing or invalid.</section>
        ) : null}
        {message ? <section className="notice success">{message}</section> : null}
        <form className="login-form" onSubmit={(event) => void savePassword(event)}>
          <label>
            New password <span aria-hidden="true">*</span>
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <label>
            Confirm password <span aria-hidden="true">*</span>
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </label>
          <button className="primary-link" disabled={!token || isSaving} type="submit">
            {isSaving ? "Saving..." : "Reset password"}
          </button>
          <a className="forgot-link" href="#">
            Back to login
          </a>
        </form>
      </section>
    </main>
  );
}

function ProfileSettingsPage({
  user,
  onUserUpdated
}: {
  user: AuthUser;
  onUserUpdated: (user: AuthUser) => void;
}) {
  const [form, setForm] = useState({
    displayName: user.display_name,
    email: user.email,
    phone: user.phone ?? "",
    jobTitle: user.job_title ?? "",
    profileImageData: user.profile_image_data ?? ""
  });
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function saveProfile(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    try {
      const result = await updateProfile(form);
      onUserUpdated(result.data);
      setMessage("Profile settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save profile settings.");
    } finally {
      setIsSaving(false);
    }
  }

  async function selectProfileImage(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Choose an image file for the profile picture.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, profileImageData: String(reader.result ?? "") }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Account</p>
          <h2>Profile Settings</h2>
        </div>
      </section>

      <section className="panel wide">
        <form className="record-form" onSubmit={(event) => void saveProfile(event)}>
          {message ? <section className="notice success">{message}</section> : null}
          <div className="profile-picture-row">
            {form.profileImageData ? (
              <img className="profile-preview" src={form.profileImageData} alt="Profile preview" />
            ) : (
              <span className="profile-preview placeholder">{form.displayName.slice(0, 1).toUpperCase()}</span>
            )}
            <label className="icon-button">
              Change profile picture
              <input
                accept="image/*"
                className="visually-hidden"
                type="file"
                onChange={(event) => void selectProfileImage(event.target.files?.[0])}
              />
            </label>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Full name *</span>
              <input
                required
                value={form.displayName}
                onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Email *</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Phone number</span>
              <input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Job title</span>
              <input
                value={form.jobTitle}
                onChange={(event) => setForm((current) => ({ ...current, jobTitle: event.target.value }))}
              />
            </label>
          </div>

          <div className="form-actions">
            <button className="primary-link" type="submit" disabled={isSaving}>
              <Save size={16} aria-hidden="true" />
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </section>

    </>
  );
}

function HelpPage() {
  const guideSections = [
    {
      title: "Systems",
      items: [
        "Use Add System to create a record. System name, category, status, and description are required.",
        "Open Systems to search, filter, sort, edit, archive, import, or export system records.",
        "Open a system name to view ownership, vendor, hosting, documentation, lifecycle, dependencies, and category details."
      ]
    },
    {
      title: "Vendors And Dependencies",
      items: [
        "Use Vendors to add, edit, view, search, and archive technology vendors.",
        "Use a system detail page to create dependencies and see what other systems may be affected if one system stops working."
      ]
    },
    {
      title: "Reports And Data Quality",
      items: [
        "Open Reports to review active systems, replacements, retired systems, missing owners, missing documentation, renewals, and data-quality warnings.",
        "Dashboard alert cards link to the related report results."
      ]
    },
    {
      title: "Data Export",
      items: [
        "Use Export CSV on the Systems page to download the current system list.",
        "Search, filter, and sort settings are included in the export where practical."
      ]
    }
  ];

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Phase 8</p>
          <h2>User Guide</h2>
        </div>
        <a className="secondary-link" href="#">
          Dashboard
        </a>
      </section>

      <section className="panel wide guide-panel">
        <p>
          Quick help for using the Technology Operations Directory. This summary follows the
          consolidated project guide in <code>docs/project-guide.md</code>.
        </p>
        <div className="guide-grid">
          {guideSections.map((section) => (
            <article className="guide-card" key={section.title}>
              <h3>{section.title}</h3>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function DashboardHome({ navigate }: { navigate: (hash: string) => void }) {
  const [totals, setTotals] = useState<DashboardTotals | null>(null);
  const [systems, setSystems] = useState<SystemRecord[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoadState("loading");

    try {
      const [nextTotals, nextSystems] = await Promise.all([
        fetchDashboardTotals(),
        fetchSystems()
      ]);

      setTotals(nextTotals);
      setSystems(nextSystems);
      setLoadState("ready");
    } catch (error) {
      console.error(error);
      setLoadState("error");
    }
  }

  function openSearchResults() {
    const query = new URLSearchParams();

    if (searchTerm.trim()) {
      query.set("search", searchTerm.trim());
    }

    navigate(`/systems${query.toString() ? `?${query.toString()}` : ""}`);
  }

  const missingDocumentation = totals?.missingDocumentationRecords ?? [];
  const withoutTechnicalOwner = totals?.withoutTechnicalOwnerRecords ?? [];
  const upcomingRenewals = totals?.upcomingRenewals ?? [];
  const filteredSystems = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    if (!normalized) {
      return systems.slice(0, 8);
    }

    return systems
      .filter((system) => {
        return [
          system.system_name,
          system.description,
          system.category_name,
          system.business_department,
          system.technical_owner,
          system.vendor,
          system.hosting_location
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));
      })
      .slice(0, 8);
  }, [searchTerm, systems]);

  return (
    <>
      <section className="toolbar" aria-label="Directory search">
        <div className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search systems, owners, departments, vendors..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                openSearchResults();
              }
            }}
          />
        </div>
        <button className="icon-button" onClick={openSearchResults}>
          <Search size={16} aria-hidden="true" />
          Search
        </button>
        <button className="icon-button" onClick={() => void loadDashboard()} title="Refresh dashboard">
          <RefreshCcw size={18} aria-hidden="true" />
          Refresh
        </button>
      </section>

      {loadState === "error" ? (
        <section className="notice error" role="alert">
          <ShieldAlert size={20} aria-hidden="true" />
          <span>Unable to load dashboard data. Confirm the backend API is running on port 3001.</span>
        </section>
      ) : null}

      <DashboardWidgetLayout
        filteredSystems={filteredSystems}
        loadState={loadState}
        missingDocumentation={missingDocumentation}
        totals={totals}
        upcomingRenewals={upcomingRenewals}
        withoutTechnicalOwner={withoutTechnicalOwner}
      />
    </>
  );
}

function DashboardWidgetLayout({
  filteredSystems,
  loadState,
  missingDocumentation,
  totals,
  upcomingRenewals,
  withoutTechnicalOwner
}: {
  filteredSystems: SystemRecord[];
  loadState: LoadState;
  missingDocumentation: SystemRecord[];
  totals: DashboardTotals | null;
  upcomingRenewals: SystemRecord[];
  withoutTechnicalOwner: SystemRecord[];
}) {
  return (
    <>
      <section className="metric-grid" aria-label="Directory overview">
        <MetricCard
          label="Total Systems"
          value={totals?.total ?? 0}
          href="#/systems"
          icon={<CircleDot size={22} aria-hidden="true" />}
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Active Systems"
          value={getStatusCount(totals, "active")}
          href="#/reports?report=active-systems"
          icon={<CheckCircle2 size={22} aria-hidden="true" />}
          tone="good"
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Being Replaced"
          value={getStatusCount(totals, "being_replaced")}
          href="#/reports?report=being-replaced"
          icon={<RefreshCcw size={22} aria-hidden="true" />}
          tone="watch"
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Retired Systems"
          value={getStatusCount(totals, "retired")}
          href="#/reports?report=retired-systems"
          icon={<Archive size={22} aria-hidden="true" />}
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Missing Documentation"
          value={totals?.missingDocumentation ?? 0}
          href="#/reports?report=missing-documentation"
          icon={<FileQuestion size={22} aria-hidden="true" />}
          tone="risk"
          loading={loadState === "loading"}
        />
        <MetricCard
          label="Without Technical Owner"
          value={totals?.withoutTechnicalOwner ?? 0}
          href="#/reports?report=missing-owners"
          icon={<UserRoundX size={22} aria-hidden="true" />}
          tone="risk"
          loading={loadState === "loading"}
        />
      </section>

      <section className="content-grid">
        <Panel title="Upcoming Renewals" subtitle="Next 90 days" icon={<CalendarClock size={18} />}>
          <RecordList
            records={upcomingRenewals.slice(0, 6)}
            emptyText="No renewals are due in the next 90 days."
            detail={(record) => (
              <>
                <span>{record.vendor ?? "No vendor"}</span>
                <span>{formatDate(record.renewal_date)}</span>
              </>
            )}
          />
          <a className="inline-link" href="#/reports?report=upcoming-renewals">
            View renewal report
          </a>
        </Panel>

        <Panel
          title="Needs Attention"
          subtitle="Documentation and ownership gaps"
          icon={<AlertTriangle size={18} />}
        >
          <div className="attention-grid">
            <AttentionColumn
              title="Missing Documentation"
              records={missingDocumentation.slice(0, 5)}
              emptyText="Every visible system has documentation."
            />
            <AttentionColumn
              title="No Technical Owner"
              records={withoutTechnicalOwner.slice(0, 5)}
              emptyText="Every visible system has a technical owner."
            />
          </div>
        </Panel>

        <Panel title="Directory Search" subtitle="Quick scan" wide>
          <SystemTable records={filteredSystems} />
        </Panel>
      </section>
    </>
  );
}

function UpdatesPage() {
  const [records, setRecords] = useState<AuditLogEvent[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    void fetchActivity()
      .then((nextRecords) => {
        setRecords(nextRecords);
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, []);

  return (
    <>
      <section className="page-heading">
        <div>
          <h2>Updates</h2>
        </div>
      </section>
      {loadState === "error" ? (
        <section className="notice error" role="alert">
          <ShieldAlert size={20} aria-hidden="true" />
          <span>Unable to load recent updates.</span>
        </section>
      ) : null}
      <Panel title="Record Activity" subtitle="Latest record changes" icon={<Clock3 size={18} />} wide>
        <RecordList
          records={records}
          emptyText={loadState === "loading" ? "Loading updates..." : "No record activity has been logged yet."}
          getHref={(record) =>
            record.entity_type === "system-records" && record.entity_id
              ? `#/systems/${record.entity_id}`
              : undefined
          }
          getTitle={(record) => record.change_summary ?? `${record.action} ${record.entity_type}`}
          detail={(record) => (
            <>
              <span>{record.user_display_name ?? record.user_email ?? "System"}</span>
              <span>{formatDateTime(record.created_at)}</span>
            </>
          )}
        />
      </Panel>
    </>
  );
}

function ReportsPage({ initialQuery }: { initialQuery: URLSearchParams }) {
  const initialReport = parseReportKey(initialQuery.get("report"));
  const [summaries, setSummaries] = useState<SystemReportSummary[]>([]);
  const [selectedReport, setSelectedReport] = useState<SystemReportKey>(initialReport);
  const [report, setReport] = useState<SystemReport | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    void fetchReportSummaries()
      .then(setSummaries)
      .catch((error) => console.error(error));
  }, []);

  useEffect(() => {
    window.history.replaceState(null, "", `#/reports?report=${selectedReport}`);
    setLoadState("loading");

    void fetchReport(selectedReport)
      .then((nextReport) => {
        setReport(nextReport);
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [selectedReport]);

  return (
    <>
      <section className="page-heading">
        <div>
          <h2>Reports</h2>
        </div>
        <div className="header-actions">
          <SupportTicketLink />
          <a className="secondary-link" href="#/systems">
            <ListFilter size={16} aria-hidden="true" />
            Systems
          </a>
        </div>
      </section>

      <section className="filter-bar" aria-label="Report selector">
        <label className="field">
          <span>Report</span>
          <select
            value={selectedReport}
            onChange={(event) => setSelectedReport(parseReportKey(event.target.value))}
          >
            {reportOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="report-card-grid" aria-label="Available reports">
        {summaries.map((summary) => (
          <a
            className={`report-card ${summary.key === selectedReport ? "selected" : ""}`}
            href={`#/reports?report=${summary.key}`}
            key={summary.key}
            onClick={(event) => {
              event.preventDefault();
              setSelectedReport(summary.key);
            }}
          >
            <strong>{summary.count}</strong>
            <span>{summary.title}</span>
          </a>
        ))}
      </section>

      {loadState === "error" ? (
        <section className="notice error" role="alert">
          <ShieldAlert size={20} aria-hidden="true" />
          <span>Unable to load this report.</span>
        </section>
      ) : null}

      <section className="panel wide">
        <div className="list-summary">
          <strong>{loadState === "loading" ? "Loading..." : `${report?.count ?? 0} results`}</strong>
          <span>{report?.description ?? "Select a report to review matching records."}</span>
        </div>
        {report ? <ReportTable report={report} /> : null}
      </section>
    </>
  );
}

function ReportTable({ report }: { report: SystemReport }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {report.columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row, index) => (
            <tr key={`${row.id ?? "group"}-${index}`}>
              {report.columns.map((column) => (
                <td key={column.key}>{formatReportCell(column.key, row[column.key], row)}</td>
              ))}
            </tr>
          ))}
          {report.rows.length === 0 ? (
            <tr>
              <td colSpan={report.columns.length} className="empty-table">
                No matching report results.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function SystemsList({
  assetTypes,
  initialQuery
}: {
  assetTypes: AssetType[];
  initialQuery: URLSearchParams;
  navigate: (hash: string) => void;
}) {
  const [records, setRecords] = useState<SystemRecord[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [importMessage, setImportMessage] = useState("");
  const [filters, setFilters] = useState(() => ({
    search: initialQuery.get("search") ?? "",
    categoryCode: initialQuery.get("categoryCode") ?? "",
    status: initialQuery.get("status") ?? "",
    technicalOwner: initialQuery.get("technicalOwner") ?? "",
    vendor: initialQuery.get("vendor") ?? "",
    incompleteOnly: initialQuery.get("incompleteOnly") === "true",
    includeArchived: initialQuery.get("includeArchived") === "true",
    sortBy: initialQuery.get("sortBy") ?? "systemName",
    sortDirection: initialQuery.get("sortDirection") ?? "asc"
  }));

  useEffect(() => {
    const query = buildSystemsQuery(filters);
    window.history.replaceState(null, "", `#/systems?${query.toString()}`);
    setLoadState("loading");

    void fetchSystems(query.toString())
      .then((nextRecords) => {
        setRecords(nextRecords);
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [filters]);

  const ownerOptions = useMemo(() => uniqueNonEmpty(records.map((record) => record.technical_owner)), [records]);
  const vendorOptions = useMemo(() => uniqueNonEmpty(records.map((record) => record.vendor)), [records]);
  const exportUrl = buildSystemsExportUrl(buildSystemsQuery(filters));

  function updateFilter(name: keyof typeof filters, value: string | boolean) {
    setFilters((current) => ({
      ...current,
      [name]: value
    }));
  }

  function clearFilters() {
    setFilters({
      search: "",
      categoryCode: "",
      status: "",
      technicalOwner: "",
      vendor: "",
      incompleteOnly: false,
      includeArchived: false,
      sortBy: "systemName",
      sortDirection: "asc"
    });
  }

  async function importCsvFile(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      const result = await importSystemsCsv(await file.text());
      setImportMessage(
        `Imported ${result.data.created.length} rows${
          result.data.errors.length ? ` with ${result.data.errors.length} row errors` : ""
        }.`
      );
      setFilters((current) => ({ ...current }));
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Unable to import CSV.");
    }
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <h2>Systems List</h2>
        </div>
        <div className="header-actions">
          <SupportTicketLink />
          <a className="primary-link" href="#/systems/new">
            <Plus size={16} aria-hidden="true" />
            Add System
          </a>
        </div>
      </section>

      <section className="filter-bar" aria-label="System list filters">
        <label className="field search-field">
          <span>Search</span>
          <input
            type="search"
            placeholder="Name or description"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Category</span>
          <select
            value={filters.categoryCode}
            onChange={(event) => updateFilter("categoryCode", event.target.value)}
          >
            <option value="">All categories</option>
            {assetTypes.map((assetType) => (
              <option key={assetType.code} value={assetType.code}>
                {assetType.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            <option value="">All statuses</option>
            {systemStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Technical owner</span>
          <select
            value={filters.technicalOwner}
            onChange={(event) => updateFilter("technicalOwner", event.target.value)}
          >
            <option value="">All owners</option>
            {ownerOptions.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Vendor</span>
          <select value={filters.vendor} onChange={(event) => updateFilter("vendor", event.target.value)}>
            <option value="">All vendors</option>
            {vendorOptions.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Sort</span>
          <select value={filters.sortBy} onChange={(event) => updateFilter("sortBy", event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field compact-field">
          <span>Direction</span>
          <select
            value={filters.sortDirection}
            onChange={(event) => updateFilter("sortDirection", event.target.value)}
          >
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={filters.incompleteOnly}
            onChange={(event) => updateFilter("incompleteOnly", event.target.checked)}
          />
          Incomplete only
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={filters.includeArchived}
            onChange={(event) => updateFilter("includeArchived", event.target.checked)}
          />
          Include archived
        </label>
        <button className="icon-button" onClick={clearFilters}>
          <X size={16} aria-hidden="true" />
          Reset
        </button>
        <a className="icon-button" href={exportUrl}>
          <Download size={16} aria-hidden="true" />
          Export CSV
        </a>
        <label className="icon-button">
          Import CSV
          <input
            accept=".csv,text/csv"
            className="visually-hidden"
            type="file"
            onChange={(event) => void importCsvFile(event.target.files?.[0])}
          />
        </label>
      </section>

      {importMessage ? <section className="notice success">{importMessage}</section> : null}

      {loadState === "error" ? (
        <section className="notice error" role="alert">
          <ShieldAlert size={20} aria-hidden="true" />
          <span>Unable to load system records.</span>
        </section>
      ) : null}

      <section className="panel wide">
        <div className="list-summary">
          <strong>{loadState === "loading" ? "Loading..." : `${records.length} systems`}</strong>
          <span>Open a row to review details or make changes.</span>
        </div>
        <SystemTable records={records} showVendor showLastReview showArchived />
      </section>
    </>
  );
}

function VendorsList({ initialQuery }: { initialQuery: URLSearchParams }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [importMessage, setImportMessage] = useState("");
  const [filters, setFilters] = useState(() => ({
    search: initialQuery.get("search") ?? "",
    includeArchived: initialQuery.get("includeArchived") === "true"
  }));

  useEffect(() => {
    const query = buildVendorsQuery(filters);
    window.history.replaceState(null, "", `#/vendors?${query.toString()}`);
    setLoadState("loading");

    void fetchVendors(query.toString())
      .then((nextVendors) => {
        setVendors(nextVendors);
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [filters]);

  async function importVendorCsvFile(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      const result = await importVendorsCsv(await file.text());
      setImportMessage(
        `Imported ${result.data.created.length} vendors${
          result.data.errors.length ? ` with ${result.data.errors.length} row errors` : ""
        }.`
      );
      setFilters((current) => ({ ...current }));
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Unable to import vendor CSV.");
    }
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <h2>Vendor Directory</h2>
        </div>
        <div className="header-actions">
          <SupportTicketLink />
          <label className="secondary-link">
            <Download size={16} aria-hidden="true" />
            Import CSV
            <input
              accept=".csv,text/csv"
              className="visually-hidden"
              type="file"
              onChange={(event) => void importVendorCsvFile(event.target.files?.[0])}
            />
          </label>
          <a className="primary-link" href="#/vendors/new">
            <Plus size={16} aria-hidden="true" />
            Add Vendor
          </a>
        </div>
      </section>

      <section className="filter-bar" aria-label="Vendor list filters">
        <label className="field search-field">
          <span>Search</span>
          <input
            type="search"
            placeholder="Vendor name, support, contract notes..."
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
          />
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={filters.includeArchived}
            onChange={(event) =>
              setFilters((current) => ({ ...current, includeArchived: event.target.checked }))
            }
          />
          Include archived
        </label>
      </section>

      {loadState === "error" ? (
        <section className="notice error" role="alert">
          <ShieldAlert size={20} aria-hidden="true" />
          <span>Unable to load vendors.</span>
        </section>
      ) : null}

      {importMessage ? <section className="notice success">{importMessage}</section> : null}

      <section className="panel wide">
        <div className="list-summary">
          <strong>{loadState === "loading" ? "Loading..." : `${vendors.length} vendors`}</strong>
          <span>Open a vendor to review support and contract information.</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Account</th>
                <th>Category</th>
                <th>Website</th>
                <th>Login</th>
                <th>Rep</th>
                <th>Archived</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.id}>
                  <td>
                    <a href={`#/vendors/${vendor.id}`}>{vendor.name}</a>
                  </td>
                  <td>{vendor.account_number ?? "Not recorded"}</td>
                  <td>{vendor.category ?? "Not recorded"}</td>
                  <td>{vendor.website_url ?? "Not recorded"}</td>
                  <td>{vendor.login_identifier ?? "Not recorded"}</td>
                  <td>{vendor.csr_sales_rep ?? vendor.account_representative ?? "Not recorded"}</td>
                  <td>{vendor.archived_at ? formatDateTime(vendor.archived_at) : "No"}</td>
                </tr>
              ))}
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-table">
                    No matching vendors found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function VendorDetail({ id, navigate }: { id: number; navigate: (hash: string) => void }) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [systems, setSystems] = useState<SystemRecord[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    setLoadState("loading");

    void fetchVendor(id)
      .then(async (nextVendor) => {
        setVendor(nextVendor);
        setSystems(
          await fetchSystems(
            `vendor=${encodeURIComponent(nextVendor.name)}&includeArchived=true&limit=100&sortBy=systemName&sortDirection=asc`
          )
        );
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [id]);

  async function archiveCurrentVendor() {
    if (!vendor || vendor.archived_at) {
      return;
    }

    const confirmed = window.confirm(`Archive ${vendor.name}? This keeps the vendor for history.`);

    if (!confirmed) {
      return;
    }

    setIsArchiving(true);

    try {
      const result = await archiveVendor(vendor.id);
      setVendor(result.data);
    } catch (error) {
      console.error(error);
      window.alert("Unable to archive this vendor.");
    } finally {
      setIsArchiving(false);
    }
  }

  if (loadState === "loading") {
    return <section className="panel wide">Loading vendor...</section>;
  }

  if (loadState === "error" || !vendor) {
    return (
      <section className="notice error" role="alert">
        <ShieldAlert size={20} aria-hidden="true" />
        <span>Unable to load this vendor.</span>
      </section>
    );
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Vendor detail</p>
          <h2>{vendor.name}</h2>
        </div>
        <div className="top-actions">
          <a className="secondary-link" href="#/vendors">
            Vendors
          </a>
          <button className="secondary-link" onClick={() => navigate(`/vendors/${vendor.id}/edit`)}>
            <Edit3 size={16} aria-hidden="true" />
            Edit
          </button>
          <button
            className="danger-button"
            disabled={Boolean(vendor.archived_at) || isArchiving}
            onClick={() => void archiveCurrentVendor()}
          >
            <Archive size={16} aria-hidden="true" />
            {vendor.archived_at ? "Archived" : "Archive"}
          </button>
        </div>
      </section>

      {vendor.archived_at ? (
        <section className="notice archived">
          <Archive size={20} aria-hidden="true" />
          <span>Archived on {formatDateTime(vendor.archived_at)}.</span>
        </section>
      ) : null}

      <section className="detail-grid">
        <DetailSection title="Vendor information">
          <DetailItem label="Vendor name" value={vendor.name} />
          <DetailItem label="Account number" value={vendor.account_number} />
          <DetailItem label="Category" value={vendor.category} />
          <DetailItem label="Website" value={vendor.website_url} isLink />
          <DetailItem label="Login" value={vendor.login_identifier} />
          <DetailItem label="Cyrious name" value={vendor.cyrious_name} />
          <DetailItem label="Email" value={vendor.support_email} />
          <DetailItem label="CSR/Sales rep" value={vendor.csr_sales_rep} />
          <DetailItem label="Direct line to rep" value={vendor.rep_direct_line} />
        </DetailSection>

        <DetailSection title="Program and payment">
          <DetailItem label="30 day terms" value={formatBooleanLabel(vendor.terms_30_day)} />
          <DetailItem label="Self-promo" value={vendor.self_promo} />
          <DetailItem label="Rebate" value={vendor.rebate} />
          <DetailItem label="NQP" value={formatBooleanLabel(vendor.nqp)} />
          <DetailItem label="AIM" value={formatBooleanLabel(vendor.aim)} />
          <DetailItem label="2023 EQP Status" value={vendor.eqp_status_2023} />
          <DetailItem label="2022 EQP Status" value={vendor.eqp_status_2022} />
          <DetailItem label="EQP volume" value={vendor.eqp_volume} />
          <DetailItem label="Payment method" value={vendor.payment_method} />
          <DetailItem label="Invoice searches" value={vendor.invoice_searches} />
          <DetailItem label="Notes" value={vendor.notes} />
        </DetailSection>

        <section className="panel detail-section wide">
          <h3>Connected systems</h3>
          <SystemTable records={systems} showVendor showLastReview showArchived />
        </section>
      </section>
    </>
  );
}

function VendorForm({
  mode,
  vendorId,
  navigate
}: {
  mode: "create" | "edit";
  vendorId?: number;
  navigate: (hash: string) => void;
}) {
  const [form, setForm] = useState<VendorFormInput>(createEmptyVendorForm());
  const [loadState, setLoadState] = useState<LoadState>(mode === "edit" ? "loading" : "ready");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (mode !== "edit" || !vendorId) {
      return;
    }

    setLoadState("loading");
    void fetchVendor(vendorId)
      .then((nextVendor) => {
        setForm(mapVendorToForm(nextVendor));
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [mode, vendorId]);

  function updateField(name: keyof VendorFormInput, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });
  }

  async function saveVendor(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrors({});
    setMessage("");

    try {
      const result =
        mode === "create" ? await createVendor(form) : await updateVendor(Number(vendorId), form);

      navigate(`/vendors/${result.data.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(mapApiIssues(error));
        setMessage(error.message);
      } else {
        console.error(error);
        setMessage("Unable to save the vendor.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (loadState === "loading") {
    return <section className="panel wide">Loading vendor form...</section>;
  }

  if (loadState === "error") {
    return (
      <section className="notice error" role="alert">
        <ShieldAlert size={20} aria-hidden="true" />
        <span>Unable to load this vendor for editing.</span>
      </section>
    );
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Vendor directory</p>
          <h2>{mode === "create" ? "Add Vendor" : "Edit Vendor"}</h2>
        </div>
      </section>

      <form className="record-form" onSubmit={(event) => void saveVendor(event)}>
        {message ? (
          <section className={`notice ${Object.keys(errors).length > 0 ? "error" : "success"}`}>
            <span>{message}</span>
          </section>
        ) : null}

        <FormSection title="Vendor information">
          <VendorTextField
            label="Vendor name"
            name="name"
            value={form.name}
            onChange={updateField}
            error={errors.name}
            required
          />
          <VendorTextField label="Account number" name="account_number" value={form.account_number} onChange={updateField} error={errors.account_number} required />
          <VendorTextField label="Website" name="website_url" value={form.website_url} onChange={updateField} error={errors.website_url} required />
          <VendorTextField label="Login" name="login_identifier" value={form.login_identifier} onChange={updateField} error={errors.login_identifier} required />
          <VendorTextField label="Cyrious name" name="cyrious_name" value={form.cyrious_name} onChange={updateField} />
          <VendorTextField label="Email" name="support_email" value={form.support_email} onChange={updateField} />
          <VendorTextField label="Category" name="category" value={form.category} onChange={updateField} />
        </FormSection>

        <FormSection title="Program and payment">
          <VendorYesNoField label="30 day terms" name="terms_30_day" value={form.terms_30_day} onChange={updateField} />
          <VendorTextField label="Self-promo" name="self_promo" value={form.self_promo} onChange={updateField} />
          <VendorTextField label="Rebate" name="rebate" value={form.rebate} onChange={updateField} />
          <VendorYesNoField label="NQP" name="nqp" value={form.nqp} onChange={updateField} />
          <VendorYesNoField label="AIM" name="aim" value={form.aim} onChange={updateField} />
          <VendorTextField label="2023 EQP Status" name="eqp_status_2023" value={form.eqp_status_2023} onChange={updateField} error={errors.eqp_status_2023} />
          <VendorTextField label="2022 EQP Status" name="eqp_status_2022" value={form.eqp_status_2022} onChange={updateField} />
          <VendorTextField label="EQP volume" name="eqp_volume" value={form.eqp_volume} onChange={updateField} />
          <VendorTextField label="Payment method" name="payment_method" value={form.payment_method} onChange={updateField} />
          <VendorTextField label="Invoice searches" name="invoice_searches" value={form.invoice_searches} onChange={updateField} />
        </FormSection>

        <FormSection title="Representative and notes">
          <VendorTextField label="CSR/Sales Rep" name="csr_sales_rep" value={form.csr_sales_rep} onChange={updateField} />
          <VendorTextField label="Direct line to rep" name="rep_direct_line" value={form.rep_direct_line} onChange={updateField} />
          <VendorTextArea label="Notes" name="notes" value={form.notes} onChange={updateField} />
        </FormSection>

        <div className="form-actions">
          <a className="secondary-link" href={mode === "edit" && vendorId ? `#/vendors/${vendorId}` : "#/vendors"}>
            Cancel
          </a>
          <button className="primary-link" type="submit" disabled={isSaving}>
            <Save size={16} aria-hidden="true" />
            {isSaving ? "Saving..." : "Save Vendor"}
          </button>
        </div>
      </form>
    </>
  );
}

function DirectoryHome() {
  const [dependencies, setDependencies] = useState<DirectoryRecord[]>([]);
  const [systems, setSystems] = useState<SystemRecord[]>([]);

  useEffect(() => {
    void fetchDirectoryRecords("system-dependencies", "limit=8")
      .then(setDependencies)
      .catch((error) => console.error(error));
    void fetchSystems("limit=100&sortBy=systemName&sortDirection=asc&includeArchived=true")
      .then(setSystems)
      .catch((error) => console.error(error));
  }, []);

  return (
    <>
      <section className="page-heading">
        <div>
          <h2>Directory Workflows</h2>
        </div>
      </section>
      <section className="panel-grid">
        {(Object.keys(directoryConfigs) as DirectoryResource[]).map((resource) => (
          <a className="metric-card neutral" href={`#/directory/${resource}`} key={resource}>
            <span className="metric-icon">
              <ListFilter size={20} aria-hidden="true" />
            </span>
            <span className="metric-value">{directoryConfigs[resource].title}</span>
            <span className="metric-label">Manage records</span>
          </a>
        ))}
      </section>
      <section className="panel wide">
        <div className="list-summary">
          <strong>Dependency Map</strong>
          <span>Quick impact view for systems connected by dependencies.</span>
        </div>
        <div className="dependency-map">
          {dependencies.map((dependency) => (
            <a className="dependency-map-row" href={`#/directory/system-dependencies/${dependency.id}`} key={String(dependency.id)}>
              <span>{systemNameById(systems, dependency.source_asset_id)}</span>
              <span className={`status-pill ${dependency.importance_level ?? "standard"}`}>
                {formatDirectoryValue(dependency.importance_level)}
              </span>
              <span>{systemNameById(systems, dependency.destination_asset_id)}</span>
              <small>{formatDirectoryValue(dependency.relationship_description)}</small>
            </a>
          ))}
          {dependencies.length === 0 ? (
            <p className="empty-state">No system dependencies are recorded yet.</p>
          ) : null}
        </div>
      </section>
    </>
  );
}

function DirectoryList({
  resource,
  initialQuery
}: {
  resource: DirectoryResource;
  initialQuery: URLSearchParams;
}) {
  const config = directoryConfigs[resource];
  const [records, setRecords] = useState<DirectoryRecord[]>([]);
  const [search, setSearch] = useState(initialQuery.get("search") ?? "");
  const [includeArchived, setIncludeArchived] = useState(initialQuery.get("includeArchived") === "true");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [systems, setSystems] = useState<SystemRecord[]>([]);

  useEffect(() => {
    if (config.fields.some((field) => field.systemSelect)) {
      void fetchSystems("limit=100&sortBy=systemName&sortDirection=asc&includeArchived=true")
        .then(setSystems)
        .catch((error) => console.error(error));
    }
  }, [config.fields]);

  useEffect(() => {
    const query = new URLSearchParams({ limit: "100" });

    if (search.trim()) {
      query.set("search", search.trim());
    }

    if (includeArchived) {
      query.set("includeArchived", "true");
    }

    window.history.replaceState(null, "", `#/directory/${resource}?${query.toString()}`);
    setLoadState("loading");
    void fetchDirectoryRecords(resource, query.toString())
      .then((nextRecords) => {
        setRecords(nextRecords);
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [resource, search, includeArchived]);

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Directory workflow</p>
          <h2>{config.title}</h2>
        </div>
        <a className="primary-link" href={`#/directory/${resource}/new`}>
          <Plus size={16} aria-hidden="true" />
          Add {config.singular}
        </a>
      </section>
      <section className="filter-bar">
        <label className="field search-field">
          <span>Search</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
          />
          Include archived
        </label>
      </section>
      {loadState === "error" ? (
        <section className="notice error" role="alert">
          <ShieldAlert size={20} aria-hidden="true" />
          <span>Unable to load records.</span>
        </section>
      ) : null}
      <section className="panel wide">
        <div className="list-summary">
          <strong>{loadState === "loading" ? "Loading..." : `${records.length} records`}</strong>
          <span>Open a row to view or edit details.</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {config.summaryFields.map((field) => (
                  <th key={field}>{humanizeField(field)}</th>
                ))}
                <th>Archived</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={String(record.id)}>
                  {config.summaryFields.map((field, index) => (
                    <td key={field}>
                      {index === 0 ? (
                        <a href={`#/directory/${resource}/${record.id}`}>
                          {formatDirectoryFieldValue(field, record[field], systems)}
                        </a>
                      ) : (
                        formatDirectoryFieldValue(field, record[field], systems)
                      )}
                    </td>
                  ))}
                  <td>{record.archived_at ? formatDateTime(String(record.archived_at)) : "No"}</td>
                </tr>
              ))}
              {records.length === 0 ? (
                <tr>
                  <td colSpan={config.summaryFields.length + 1} className="empty-table">
                    No records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function DirectoryDetail({
  resource,
  id,
  navigate
}: {
  resource: DirectoryResource;
  id: number;
  navigate: (hash: string) => void;
}) {
  const config = directoryConfigs[resource];
  const [record, setRecord] = useState<DirectoryRecord | null>(null);
  const [systems, setSystems] = useState<SystemRecord[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    if (config.fields.some((field) => field.systemSelect)) {
      void fetchSystems("limit=100&sortBy=systemName&sortDirection=asc&includeArchived=true")
        .then(setSystems)
        .catch((error) => console.error(error));
    }
  }, [config.fields]);

  useEffect(() => {
    setLoadState("loading");
    void fetchDirectoryRecord(resource, id)
      .then((nextRecord) => {
        setRecord(nextRecord);
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [resource, id]);

  async function archiveRecord() {
    const confirmed = window.confirm(`Archive this ${config.singular.toLowerCase()}?`);

    if (!confirmed) {
      return;
    }

    await archiveDirectoryRecord(resource, id);
    navigate(`/directory/${resource}`);
  }

  if (loadState === "loading") {
    return <section className="panel wide">Loading record...</section>;
  }

  if (loadState === "error" || !record) {
    return (
      <section className="notice error" role="alert">
        <ShieldAlert size={20} aria-hidden="true" />
        <span>Unable to load record.</span>
      </section>
    );
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">{config.singular}</p>
          <h2>{formatDirectoryValue(record.name ?? record.id)}</h2>
        </div>
        <div className="top-actions">
          <a className="secondary-link" href={`#/directory/${resource}`}>
            Back
          </a>
          <button className="secondary-link" onClick={() => navigate(`/directory/${resource}/${id}/edit`)}>
            <Edit3 size={16} aria-hidden="true" />
            Edit
          </button>
          <button className="danger-button" onClick={() => void archiveRecord()}>
            <Archive size={16} aria-hidden="true" />
            Archive
          </button>
        </div>
      </section>
      <DetailSection title={`${config.singular} details`} wide>
        {config.fields.map((field) => (
          <DetailItem
            key={field.name}
            label={field.label}
            value={formatDirectoryFieldValue(field.name, record[field.name], systems)}
          />
        ))}
      </DetailSection>
    </>
  );
}

function DirectoryForm({
  resource,
  mode,
  id,
  navigate
}: {
  resource: DirectoryResource;
  mode: "create" | "edit";
  id?: number;
  navigate: (hash: string) => void;
}) {
  const config = directoryConfigs[resource];
  const [form, setForm] = useState<Record<string, string>>(() => createDirectoryForm(config.fields));
  const [systems, setSystems] = useState<SystemRecord[]>([]);
  const [loadState, setLoadState] = useState<LoadState>(mode === "edit" ? "loading" : "ready");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config.fields.some((field) => field.systemSelect)) {
      void fetchSystems("limit=100&sortBy=systemName&sortDirection=asc&includeArchived=true")
        .then(setSystems)
        .catch((error) => console.error(error));
    }
  }, [config.fields]);

  useEffect(() => {
    if (mode !== "edit" || !id) {
      return;
    }

    setLoadState("loading");
    void fetchDirectoryRecord(resource, id)
      .then((record) => {
        setForm(recordToStringForm(record));
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [mode, resource, id]);

  async function saveRecord(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = formToDirectoryRecord(form, config.fields);
      const result =
        mode === "create"
          ? await createDirectoryRecord(resource, payload)
          : await updateDirectoryRecord(resource, Number(id), payload);

      navigate(`/directory/${resource}/${result.data.id}`);
    } catch (error) {
      console.error(error);
      window.alert(`Unable to save ${config.singular.toLowerCase()}.`);
    } finally {
      setIsSaving(false);
    }
  }

  if (loadState === "loading") {
    return <section className="panel wide">Loading form...</section>;
  }

  if (loadState === "error") {
    return (
      <section className="notice error" role="alert">
        <ShieldAlert size={20} aria-hidden="true" />
        <span>Unable to load this record for editing.</span>
      </section>
    );
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">{config.title}</p>
          <h2>{mode === "create" ? `Add ${config.singular}` : `Edit ${config.singular}`}</h2>
        </div>
      </section>
      <form className="record-form" onSubmit={(event) => void saveRecord(event)}>
        <FormSection title={`${config.singular} information`}>
          {config.fields.map((field) => (
            <DirectoryFieldInput
              key={field.name}
              field={field}
              value={form[field.name] ?? ""}
              systems={systems}
              onChange={(value) => setForm((current) => ({ ...current, [field.name]: value }))}
            />
          ))}
        </FormSection>
        <div className="form-actions">
          <a className="secondary-link" href={mode === "edit" && id ? `#/directory/${resource}/${id}` : `#/directory/${resource}`}>
            Cancel
          </a>
          <button className="primary-link" type="submit" disabled={isSaving}>
            <Save size={16} aria-hidden="true" />
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </>
  );
}

function SystemDetail({
  id,
  assetTypes,
  navigate
}: {
  id: number;
  assetTypes: AssetType[];
  navigate: (hash: string) => void;
}) {
  const [record, setRecord] = useState<SystemRecord | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setLoadState("loading");

    void fetchSystem(id)
      .then((nextRecord) => {
        setRecord(nextRecord);
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [id]);

  async function archiveCurrentSystem() {
    if (!record || record.archived_at) {
      return;
    }

    const confirmed = window.confirm(`Archive ${record.system_name}? This keeps the record for history.`);

    if (!confirmed) {
      return;
    }

    setIsArchiving(true);

    try {
      const result = await archiveSystem(record.id);
      setRecord(result.data);
    } catch (error) {
      console.error(error);
      window.alert("Unable to archive this system record.");
    } finally {
      setIsArchiving(false);
    }
  }

  async function deleteCurrentSystem() {
    if (!record) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${record.system_name}? This cannot be undone. Use Archive instead if the record should be kept for history.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteSystem(record.id);
      navigate("/systems");
    } catch (error) {
      console.error(error);
      window.alert("Unable to delete this system record.");
      setIsDeleting(false);
    }
  }

  if (loadState === "loading") {
    return <section className="panel wide">Loading system record...</section>;
  }

  if (loadState === "error" || !record) {
    return (
      <section className="notice error" role="alert">
        <ShieldAlert size={20} aria-hidden="true" />
        <span>Unable to load this system record.</span>
      </section>
    );
  }

  const categoryName =
    assetTypes.find((assetType) => assetType.code === record.category_code)?.name ?? record.category_name;

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">System detail</p>
          <h2>{record.system_name}</h2>
        </div>
        <div className="top-actions">
          <a className="secondary-link" href="#/systems">
            Systems
          </a>
          <button className="secondary-link" onClick={() => navigate(`/systems/${record.id}/edit`)}>
            <Edit3 size={16} aria-hidden="true" />
            Edit
          </button>
          <button
            className="danger-button"
            disabled={Boolean(record.archived_at) || isArchiving}
            onClick={() => void archiveCurrentSystem()}
          >
            <Archive size={16} aria-hidden="true" />
            {record.archived_at ? "Archived" : "Archive"}
          </button>
          <button
            className="danger-button"
            disabled={isDeleting}
            onClick={() => void deleteCurrentSystem()}
          >
            <Trash2 size={16} aria-hidden="true" />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </section>

      {record.archived_at ? (
        <section className="notice archived">
          <Archive size={20} aria-hidden="true" />
          <span>Archived on {formatDateTime(record.archived_at)}. The record remains available for history.</span>
        </section>
      ) : null}

      {record.quality_warnings.length > 0 ? (
        <section className="notice warning quality-summary">
          <AlertTriangle size={20} aria-hidden="true" />
          <div>
            <strong>{record.quality_warning_count} data-quality warning(s)</strong>
            <ul>
              {record.quality_warnings.map((warning) => (
                <li key={warning.code}>{warning.message}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="detail-grid">
        <DetailSection title="General information">
          <DetailItem label="Name" value={record.system_name} />
          <DetailItem label="Description" value={record.description} />
          <DetailItem label="Category" value={categoryName} />
          <DetailItem label="Status" value={statusLabels[record.status]} />
          <DetailItem label="Business department" value={record.business_department} />
        </DetailSection>

        <DetailSection title="Ownership and support">
          <DetailItem label="Department owner" value={record.department_owner} />
          <DetailItem label="Technical owner" value={record.technical_owner} />
          <DetailItem label="Vendor" value={record.vendor} />
          <DetailItem label="Support contact" value={record.support_contact} />
        </DetailSection>

        <DetailSection title="Technical information">
          <DetailItem label="Hosting location" value={record.hosting_location} />
          <DetailItem label="Server name" value={record.server_name} />
          <DetailItem label="Database name" value={record.database_name} />
          <DetailItem label="Production URL" value={record.production_url} isLink />
          <DetailItem label="Test URL" value={record.test_url} isLink />
        </DetailSection>

        <DetailSection title="Documentation">
          <DetailItem label="Documentation link" value={record.documentation_url} isLink />
          <DetailItem label="Password-vault reference" value={record.password_vault_reference} />
          <DetailItem label="Troubleshooting notes" value={record.notes} />
        </DetailSection>

        <DetailSection title="Lifecycle information" wide>
          <DetailItem label="Renewal date" value={formatDate(record.renewal_date)} />
          <DetailItem label="Last review date" value={formatDate(record.last_review_date)} />
          <DetailItem label="Replacement system" value={record.replacement_system} />
          <DetailItem label="Retirement notes" value={record.retirement_notes} />
        </DetailSection>

        <CategoryDetailSection systemId={record.id} />
        <SystemTagsSection systemId={record.id} />
        <SystemDependenciesSection system={record} />
      </section>
    </>
  );
}

function CategoryDetailSection({ systemId }: { systemId: number }) {
  const [details, setDetails] = useState<CategoryDetails | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void fetchSystemCategoryDetails(systemId)
      .then((nextDetails) => {
        setDetails(nextDetails);
        setForm(recordToStringForm(nextDetails.fields ?? {}));
      })
      .catch((error) => console.error(error));
  }, [systemId]);

  if (!details?.fields) {
    return null;
  }

  async function saveDetails(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const result = await updateSystemCategoryDetails(systemId, formToDirectoryRecord(form));
      setDetails(result.data);
      setForm(recordToStringForm(result.data.fields ?? {}));
    } catch (error) {
      console.error(error);
      window.alert("Unable to save category details.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel detail-section wide">
      <h3>{details.categoryName} details</h3>
      <form className="form-grid" onSubmit={(event) => void saveDetails(event)}>
        {Object.keys(details.fields).map((field) => (
          <DirectoryFieldInput
            key={field}
            field={categoryDetailField(details.categoryCode, field)}
            value={form[field] ?? ""}
            systems={[]}
            onChange={(value) => setForm((current) => ({ ...current, [field]: value }))}
          />
        ))}
        <div className="form-actions full-field">
          <button className="secondary-link" type="submit" disabled={isSaving}>
            <Save size={16} aria-hidden="true" />
            {isSaving ? "Saving..." : "Save Details"}
          </button>
        </div>
      </form>
    </section>
  );
}

function categoryDetailField(categoryCode: string, fieldName: string): DirectoryField {
  if (categoryCode === "server" && fieldName === "operating_system") {
    return {
      name: fieldName,
      label: "OS type",
      type: "select",
      options: optionValues(["Linux", "Windows", "Other"])
    };
  }

  return {
    name: fieldName,
    label: humanizeField(fieldName),
    type: fieldName === "notes" ? "textarea" : "text"
  };
}

function SystemTagsSection({ systemId }: { systemId: number }) {
  const [assignedTags, setAssignedTags] = useState<DirectoryRecord[]>([]);
  const [allTags, setAllTags] = useState<DirectoryRecord[]>([]);
  const [selectedTagId, setSelectedTagId] = useState("");

  useEffect(() => {
    void loadTags();
    void fetchDirectoryRecords("tags", "limit=100")
      .then(setAllTags)
      .catch((error) => console.error(error));
  }, [systemId]);

  async function loadTags() {
    try {
      setAssignedTags(await fetchSystemTags(systemId));
    } catch (error) {
      console.error(error);
    }
  }

  async function assignTag(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTagId) {
      return;
    }

    const result = await addSystemTag(systemId, Number(selectedTagId));
    setAssignedTags(result.data);
    setSelectedTagId("");
  }

  async function unassignTag(tagId: number) {
    await removeSystemTag(systemId, tagId);
    await loadTags();
  }

  const assignedIds = new Set(assignedTags.map((tag) => Number(tag.id)));
  const availableTags = allTags.filter((tag) => !assignedIds.has(Number(tag.id)));

  return (
    <section className="panel detail-section wide">
      <h3>Tags</h3>
      <div className="tag-list">
        {assignedTags.map((tag) => (
          <span className="status-pill neutral" key={String(tag.id)}>
            {formatDirectoryValue(tag.name)}
            <button type="button" onClick={() => void unassignTag(Number(tag.id))}>
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ))}
        {assignedTags.length === 0 ? <p className="empty-state">No tags assigned.</p> : null}
      </div>
      <form className="filter-bar" onSubmit={(event) => void assignTag(event)}>
        <label className="field">
          <span>Add tag</span>
          <select value={selectedTagId} onChange={(event) => setSelectedTagId(event.target.value)}>
            <option value="">Select tag</option>
            {availableTags.map((tag) => (
              <option key={String(tag.id)} value={String(tag.id)}>
                {formatDirectoryValue(tag.name)}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary-link" type="submit">
          Add Tag
        </button>
      </form>
    </section>
  );
}

function SystemDependenciesSection({ system }: { system: SystemRecord }) {
  const [summary, setSummary] = useState<SystemDependencySummary>({ dependsOn: [], dependedOnBy: [] });
  const [systems, setSystems] = useState<SystemRecord[]>([]);
  const [form, setForm] = useState<Record<string, string>>(() =>
    createDependencyForm(system.id)
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadDependencies();
    void fetchSystems("limit=100&sortBy=systemName&sortDirection=asc&includeArchived=true")
      .then(setSystems)
      .catch((error) => console.error(error));
  }, [system.id]);

  async function loadDependencies() {
    try {
      setSummary(await fetchSystemDependencies(system.id));
    } catch (error) {
      console.error(error);
    }
  }

  function editDependency(dependency: SystemDependency) {
    setEditingId(dependency.id);
    setForm({
      source_asset_id: String(dependency.source_asset_id),
      destination_asset_id: String(dependency.destination_asset_id),
      relationship_description: dependency.relationship_description,
      data_or_service_exchanged: dependency.data_or_service_exchanged ?? "",
      importance_level: dependency.importance_level,
      notes: dependency.notes ?? ""
    });
  }

  async function saveDependency(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = createDependencyPayload(form);

      if (editingId) {
        await updateDirectoryRecord("system-dependencies", editingId, payload);
      } else {
        await createDirectoryRecord("system-dependencies", payload);
      }

      setEditingId(null);
      setForm(createDependencyForm(system.id));
      await loadDependencies();
    } catch (error) {
      console.error(error);
      window.alert("Unable to save dependency.");
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveDependency(id: number) {
    const confirmed = window.confirm("Archive this dependency?");

    if (!confirmed) {
      return;
    }

    await archiveDirectoryRecord("system-dependencies", id);
    await loadDependencies();
  }

  return (
    <section className="panel detail-section wide">
      <h3>Dependencies</h3>
      <div className="dependency-columns">
        <DependencyList
          title="This system depends on"
          dependencies={summary.dependsOn}
          emptyText="No upstream dependencies recorded."
          onEdit={editDependency}
          onArchive={(id) => void archiveDependency(id)}
        />
        <DependencyList
          title="Systems affected if this system stops working"
          dependencies={summary.dependedOnBy}
          emptyText="No downstream impact recorded."
          onEdit={editDependency}
          onArchive={(id) => void archiveDependency(id)}
        />
      </div>

      <form className="record-form compact-form" onSubmit={(event) => void saveDependency(event)}>
        <FormSection title={editingId ? "Edit dependency" : "Add dependency"}>
          {dependencyFields().map((field) => (
            <DirectoryFieldInput
              key={field.name}
              field={field}
              value={form[field.name] ?? ""}
              systems={systems}
              onChange={(value) => setForm((current) => ({ ...current, [field.name]: value }))}
            />
          ))}
        </FormSection>
        <div className="form-actions">
          {editingId ? (
            <button
              className="secondary-link"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(createDependencyForm(system.id));
              }}
            >
              Cancel
            </button>
          ) : null}
          <button className="primary-link" type="submit" disabled={isSaving}>
            <Save size={16} aria-hidden="true" />
            {isSaving ? "Saving..." : "Save Dependency"}
          </button>
        </div>
      </form>
    </section>
  );
}

function DependencyList({
  title,
  dependencies,
  emptyText,
  onEdit,
  onArchive
}: {
  title: string;
  dependencies: SystemDependency[];
  emptyText: string;
  onEdit: (dependency: SystemDependency) => void;
  onArchive: (id: number) => void;
}) {
  return (
    <div className="attention-column">
      <h3>{title}</h3>
      {dependencies.length === 0 ? (
        <p className="empty-state">{emptyText}</p>
      ) : (
        <ul>
          {dependencies.map((dependency) => (
            <li key={dependency.id}>
              <a href={`#/systems/${dependency.related_system_id}`}>
                {dependency.related_system_name}
              </a>
              <span className={`status-pill ${dependency.importance_level}`}>{dependency.importance_level}</span>
              <span>{dependency.relationship_description}</span>
              <span>{dependency.data_or_service_exchanged ?? "No data or service recorded"}</span>
              <span>{dependency.notes ?? "No notes"}</span>
              <div className="top-actions">
                <button className="secondary-link" type="button" onClick={() => onEdit(dependency)}>
                  Edit
                </button>
                <button className="danger-button" type="button" onClick={() => onArchive(dependency.id)}>
                  Archive
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SystemForm({
  assetTypes,
  mode,
  systemId,
  navigate
}: {
  assetTypes: AssetType[];
  mode: "create" | "edit";
  systemId?: number;
  navigate: (hash: string) => void;
}) {
  const [form, setForm] = useState<SystemRecordFormInput>(createEmptyForm());
  const [loadState, setLoadState] = useState<LoadState>(mode === "edit" ? "loading" : "ready");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<SystemRecordWarning[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (form.categoryCode || assetTypes.length === 0) {
      return;
    }

    setForm((current) => ({
      ...current,
      categoryCode: assetTypes[0].code
    }));
  }, [assetTypes, form.categoryCode]);

  useEffect(() => {
    if (mode !== "edit" || !systemId) {
      return;
    }

    setLoadState("loading");
    void fetchSystem(systemId)
      .then((record) => {
        setForm(mapRecordToForm(record));
        setLoadState("ready");
      })
      .catch((error) => {
        console.error(error);
        setLoadState("error");
      });
  }, [mode, systemId]);

  function updateField(name: keyof SystemRecordFormInput, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value
    }));
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });
  }

  async function saveSystem(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrors({});
    setWarnings([]);
    setMessage("");

    try {
      const result =
        mode === "create" ? await createSystem(form) : await updateSystem(Number(systemId), form);

      setWarnings(result.warnings);
      setMessage("System record saved.");
      navigate(`/systems/${result.data.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(mapApiIssues(error));
        setMessage(error.message);
      } else {
        console.error(error);
        setMessage("Unable to save the system record.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (loadState === "loading") {
    return <section className="panel wide">Loading form...</section>;
  }

  if (loadState === "error") {
    return (
      <section className="notice error" role="alert">
        <ShieldAlert size={20} aria-hidden="true" />
        <span>Unable to load this system record for editing.</span>
      </section>
    );
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">System record</p>
          <h2>{mode === "create" ? "Add System" : "Edit System"}</h2>
        </div>
      </section>

      <form className="record-form" onSubmit={(event) => void saveSystem(event)}>
        {message ? (
          <section className={`notice ${Object.keys(errors).length > 0 ? "error" : "success"}`}>
            <span>{message}</span>
          </section>
        ) : null}
        {warnings.map((warning) => (
          <section className="notice warning" key={warning.code}>
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{warning.message}</span>
          </section>
        ))}

        <FormSection title="General information">
          <TextField
            label="System name"
            name="systemName"
            value={form.systemName}
            onChange={updateField}
            error={errors.systemName}
            required
          />
          <label className="field">
            <span>Category *</span>
            <select
              value={form.categoryCode}
              onChange={(event) => updateField("categoryCode", event.target.value)}
              required
            >
              <option value="">Select category</option>
              {assetTypes.map((assetType) => (
                <option key={assetType.code} value={assetType.code}>
                  {assetType.name}
                </option>
              ))}
            </select>
            {errors.categoryCode ? <em>{errors.categoryCode}</em> : null}
          </label>
          <label className="field">
            <span>Status *</span>
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
              required
            >
              {systemStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
            {errors.status ? <em>{errors.status}</em> : null}
          </label>
          <TextAreaField
            label="Description"
            name="description"
            value={form.description}
            onChange={updateField}
            error={errors.description}
            required
          />
        </FormSection>

        <FormSection title="Ownership and support">
          <TextField label="Business department" name="businessDepartment" value={form.businessDepartment} onChange={updateField} />
          <TextField label="Department owner" name="departmentOwner" value={form.departmentOwner} onChange={updateField} />
          <TextField label="Technical owner" name="technicalOwner" value={form.technicalOwner} onChange={updateField} />
          <TextField label="Vendor" name="vendor" value={form.vendor} onChange={updateField} />
          <TextField label="Support contact" name="supportContact" value={form.supportContact} onChange={updateField} />
        </FormSection>

        <FormSection title="Technical information">
          <TextField label="Hosting location" name="hostingLocation" value={form.hostingLocation} onChange={updateField} />
          <TextField label="Server name" name="serverName" value={form.serverName} onChange={updateField} />
          <TextField label="Database name" name="databaseName" value={form.databaseName} onChange={updateField} />
          <TextField label="Production URL" name="productionUrl" value={form.productionUrl} onChange={updateField} error={errors.productionUrl} />
          <TextField label="Test URL" name="testUrl" value={form.testUrl} onChange={updateField} error={errors.testUrl} />
          <TextField label="Documentation link" name="documentationLink" value={form.documentationLink} onChange={updateField} error={errors.documentationLink} />
          <TextField label="Password-vault reference" name="passwordVaultReference" value={form.passwordVaultReference} onChange={updateField} />
        </FormSection>

        <FormSection title="Lifecycle information">
          <TextField label="Renewal date" name="renewalDate" type="date" value={form.renewalDate} onChange={updateField} error={errors.renewalDate} />
          <TextField label="Last review date" name="lastReviewDate" type="date" value={form.lastReviewDate} onChange={updateField} error={errors.lastReviewDate} />
          <TextField label="Replacement system" name="replacementSystem" value={form.replacementSystem} onChange={updateField} />
          <TextAreaField label="Retirement notes" name="retirementNotes" value={form.retirementNotes} onChange={updateField} />
          <TextAreaField label="Notes" name="notes" value={form.notes} onChange={updateField} />
        </FormSection>

        <div className="form-actions">
          <a className="secondary-link" href={mode === "edit" && systemId ? `#/systems/${systemId}` : "#/systems"}>
            Cancel
          </a>
          <button className="primary-link" type="submit" disabled={isSaving}>
            <Save size={16} aria-hidden="true" />
            {isSaving ? "Saving..." : "Save System"}
          </button>
        </div>
      </form>
    </>
  );
}

function MetricCard({
  label,
  value,
  href,
  icon,
  tone = "neutral",
  loading
}: {
  label: string;
  value: number;
  href: string;
  icon: ReactNode;
  tone?: "neutral" | "good" | "watch" | "risk";
  loading: boolean;
}) {
  return (
    <a className={`metric-card ${tone}`} href={href}>
      <span className="metric-icon">{icon}</span>
      <span className="metric-value">{loading ? "..." : value.toLocaleString()}</span>
      <span className="metric-label">{label}</span>
    </a>
  );
}

function Panel({
  title,
  subtitle,
  icon,
  wide,
  children
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`panel ${wide ? "wide" : ""}`}>
      <header className="panel-header">
        <div>
          <h2>
            {icon}
            {title}
          </h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

function RecordList<TRecord extends { id: number }>({
  records,
  emptyText,
  detail,
  getHref,
  getTitle
}: {
  records: TRecord[];
  emptyText: string;
  detail: (record: TRecord) => ReactNode;
  getHref?: (record: TRecord) => string | undefined;
  getTitle?: (record: TRecord) => string;
}) {
  if (records.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <ul className="record-list">
      {records.map((record) => (
        <li key={record.id}>
          <a href={getHref?.(record) ?? getRecordHref(record as unknown as SystemRecord)}>
            {getTitle?.(record) ?? (record as unknown as SystemRecord).system_name}
          </a>
          <div className="record-meta">{detail(record)}</div>
        </li>
      ))}
    </ul>
  );
}

function AttentionColumn({
  title,
  records,
  emptyText
}: {
  title: string;
  records: SystemRecord[];
  emptyText: string;
}) {
  return (
    <div className="attention-column">
      <h3>{title}</h3>
      {records.length > 0 ? (
        <ul>
          {records.map((record) => (
            <li key={record.id}>
              <a href={getRecordHref(record)}>{record.system_name}</a>
              <span>{record.business_department ?? record.category_name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-state">{emptyText}</p>
      )}
    </div>
  );
}

function SystemTable({
  records,
  showVendor,
  showLastReview,
  showArchived
}: {
  records: SystemRecord[];
  showVendor?: boolean;
  showLastReview?: boolean;
  showArchived?: boolean;
}) {
  const columnCount =
    5 + 1 + (showVendor ? 1 : 0) + (showLastReview ? 1 : 0) + (showArchived ? 1 : 0);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>System</th>
            <th>Category</th>
            <th>Status</th>
            <th>Technical owner</th>
            {showVendor ? <th>Vendor</th> : null}
            <th>Department</th>
            <th>Warnings</th>
            {showLastReview ? <th>Last review</th> : null}
            {showArchived ? <th>Archived</th> : null}
          </tr>
        </thead>
        <tbody>
          {records.map((system) => (
            <tr key={system.id}>
              <td>
                <a href={getRecordHref(system)}>{system.system_name}</a>
              </td>
              <td>{system.category_name}</td>
              <td>
                <span className={`status-pill ${system.status}`}>{statusLabels[system.status]}</span>
              </td>
              <td>{system.technical_owner ?? "Not assigned"}</td>
              {showVendor ? <td>{system.vendor ?? "Not assigned"}</td> : null}
              <td>{system.business_department ?? "Not assigned"}</td>
              <td>
                {system.quality_warning_count > 0 ? (
                  <span className="quality-badge">{system.quality_warning_count}</span>
                ) : (
                  <span className="quality-badge quality-badge-zero">0</span>
                )}
              </td>
              {showLastReview ? <td>{formatDate(system.last_review_date)}</td> : null}
              {showArchived ? <td>{system.archived_at ? formatDateTime(system.archived_at) : "No"}</td> : null}
            </tr>
          ))}
          {records.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="empty-table">
                No matching systems found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function DetailSection({
  title,
  wide,
  children
}: {
  title: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`panel detail-section ${wide ? "wide" : ""}`}>
      <h3>{title}</h3>
      <dl>{children}</dl>
    </section>
  );
}

function DetailItem({ label, value, isLink }: { label: string; value: string | null; isLink?: boolean }) {
  const displayValue = value?.trim() ? value : "Not recorded";

  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {isLink && value?.trim() ? (
          <a href={value} target="_blank" rel="noreferrer">
            {value}
          </a>
        ) : (
          displayValue
        )}
      </dd>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="form-section">
      <h3>{title}</h3>
      <div className="form-grid">{children}</div>
    </section>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  required
}: {
  label: string;
  name: keyof SystemRecordFormInput;
  value: string;
  onChange: (name: keyof SystemRecordFormInput, value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        required={required}
      />
      {error ? <em>{error}</em> : null}
    </label>
  );
}

function TextAreaField({
  label,
  name,
  value,
  onChange,
  error,
  required
}: {
  label: string;
  name: keyof SystemRecordFormInput;
  value: string;
  onChange: (name: keyof SystemRecordFormInput, value: string) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="field full-field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <textarea value={value} onChange={(event) => onChange(name, event.target.value)} required={required} />
      {error ? <em>{error}</em> : null}
    </label>
  );
}

function VendorTextField({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  required
}: {
  label: string;
  name: keyof VendorFormInput;
  value: string;
  onChange: (name: keyof VendorFormInput, value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <input type={type} value={value} onChange={(event) => onChange(name, event.target.value)} required={required} />
      {error ? <em>{error}</em> : null}
    </label>
  );
}

function VendorTextArea({
  label,
  name,
  value,
  onChange,
  error
}: {
  label: string;
  name: keyof VendorFormInput;
  value: string;
  onChange: (name: keyof VendorFormInput, value: string) => void;
  error?: string;
}) {
  return (
    <label className="field full-field">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(name, event.target.value)} />
      {error ? <em>{error}</em> : null}
    </label>
  );
}

function VendorYesNoField({
  label,
  name,
  value,
  onChange
}: {
  label: string;
  name: keyof VendorFormInput;
  value: string;
  onChange: (name: keyof VendorFormInput, value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(name, event.target.value)}>
        <option value="">Not recorded</option>
        <option value="1">Yes</option>
        <option value="0">No</option>
      </select>
    </label>
  );
}

function DirectoryFieldInput({
  field,
  value,
  systems,
  onChange
}: {
  field: DirectoryField;
  value: string;
  systems: SystemRecord[];
  onChange: (value: string) => void;
}) {
  if (field.systemSelect) {
    return (
      <label className="field">
        <span>
          {field.label}
          {field.required ? " *" : ""}
        </span>
        <select value={value} onChange={(event) => onChange(event.target.value)} required={field.required}>
          <option value="">Select system</option>
          {systems.map((system) => (
            <option key={system.id} value={system.id}>
              {system.system_name}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="field full-field">
        <span>{field.label}</span>
        <textarea value={value} onChange={(event) => onChange(event.target.value)} required={field.required} />
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="field">
        <span>
          {field.label}
          {field.required ? " *" : ""}
        </span>
        <select value={value} onChange={(event) => onChange(event.target.value)} required={field.required}>
          <option value="">Select value</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="field">
      <span>
        {field.label}
        {field.required ? " *" : ""}
      </span>
      <input
        type={field.type ?? "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={field.required}
      />
    </label>
  );
}

function parseRoute(): Route {
  return parseRouteFromHash(window.location.hash);
}

export function parseRouteFromHash(rawHash: string): Route {
  const hash = rawHash.replace(/^#/, "");
  const [pathPart, queryPart] = hash.split("?");
  const path = pathPart || "/";
  const query = new URLSearchParams(queryPart ?? "");
  const segments = path.split("/").filter(Boolean);

  if (segments[0] === "reports") {
    return { name: "reports", query };
  }

  if (segments[0] === "help") {
    return { name: "help" };
  }

  if (segments[0] === "reset-password") {
    return { name: "resetPassword", query };
  }

  if (segments[0] === "updates") {
    return { name: "updates" };
  }

  if (segments[0] === "profile") {
    return { name: "profile" };
  }

  if (segments[0] === "directory") {
    if (segments.length === 1) {
      return { name: "directoryHome" };
    }

    const resource = parseDirectoryResource(segments[1]);

    if (!resource) {
      return { name: "directoryHome" };
    }

    if (segments.length === 2) {
      return { name: "directoryList", resource, query };
    }

    if (segments[2] === "new") {
      return { name: "directoryNew", resource };
    }

    const id = Number(segments[2]);

    if (Number.isInteger(id) && id > 0 && segments[3] === "edit") {
      return { name: "directoryEdit", resource, id };
    }

    if (Number.isInteger(id) && id > 0) {
      return { name: "directoryDetail", resource, id };
    }

    return { name: "directoryList", resource, query };
  }

  if (segments[0] === "vendors") {
    if (segments.length === 1) {
      return { name: "vendors", query };
    }

    if (segments[1] === "new") {
      return { name: "newVendor" };
    }

    const vendorId = Number(segments[1]);

    if (Number.isInteger(vendorId) && vendorId > 0 && segments[2] === "edit") {
      return { name: "editVendor", id: vendorId };
    }

    if (Number.isInteger(vendorId) && vendorId > 0) {
      return { name: "vendorDetail", id: vendorId };
    }

    return { name: "vendors", query };
  }

  if (segments[0] !== "systems") {
    return { name: "dashboard" };
  }

  if (segments.length === 1) {
    return { name: "systems", query };
  }

  if (segments[1] === "new") {
    return { name: "newSystem" };
  }

  const id = Number(segments[1]);

  if (Number.isInteger(id) && id > 0 && segments[2] === "edit") {
    return { name: "editSystem", id };
  }

  if (Number.isInteger(id) && id > 0) {
    return { name: "systemDetail", id };
  }

  return { name: "systems", query };
}

export function buildSystemsQuery(filters: {
  search: string;
  categoryCode: string;
  status: string;
  technicalOwner: string;
  vendor: string;
  incompleteOnly: boolean;
  includeArchived: boolean;
  sortBy: string;
  sortDirection: string;
}) {
  const query = new URLSearchParams({
    limit: "100",
    sortBy: filters.sortBy,
    sortDirection: filters.sortDirection
  });

  for (const key of ["search", "categoryCode", "status", "technicalOwner", "vendor"] as const) {
    if (filters[key]) {
      query.set(key, filters[key]);
    }
  }

  if (filters.incompleteOnly) {
    query.set("incompleteOnly", "true");
  }

  if (filters.includeArchived) {
    query.set("includeArchived", "true");
  }

  return query;
}

export function buildSystemsExportUrl(query: URLSearchParams) {
  const queryString = query.toString();

  return `/api/system-records/export.csv${queryString ? `?${queryString}` : ""}`;
}

export function parseReportKey(value: string | null | undefined): SystemReportKey {
  return reportKeys.find((key) => key === value) ?? "data-quality";
}

function reportLabel(key: SystemReportKey) {
  return key
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatReportCell(
  key: string,
  value: string | number | null | undefined,
  row: Record<string, string | number | null>
) {
  if (key === "system_name" && row.id) {
    return <a href={`#/systems/${row.id}`}>{value ?? "Not recorded"}</a>;
  }

  if (key === "status" && typeof value === "string" && value in statusLabels) {
    return statusLabels[value as SystemStatus];
  }

  if (key.includes("date") && typeof value === "string") {
    return formatDate(value);
  }

  return value ?? "Not recorded";
}

export function buildVendorsQuery(filters: { search: string; includeArchived: boolean }) {
  const query = new URLSearchParams({
    limit: "100"
  });

  if (filters.search.trim()) {
    query.set("search", filters.search.trim());
  }

  if (filters.includeArchived) {
    query.set("includeArchived", "true");
  }

  return query;
}

function parseDirectoryResource(value: string | undefined): DirectoryResource | undefined {
  return (Object.keys(directoryConfigs) as DirectoryResource[]).find((resource) => resource === value);
}

function optionValues(values: string[]) {
  return values.map((value) => ({ value, label: humanizeField(value) }));
}

function dependencyFields(): DirectoryField[] {
  return [
    { name: "source_asset_id", label: "Source system", systemSelect: true, required: true },
    { name: "destination_asset_id", label: "Destination system", systemSelect: true, required: true },
    { name: "relationship_description", label: "Relationship description", required: true },
    { name: "data_or_service_exchanged", label: "Data or service exchanged", type: "textarea" },
    {
      name: "importance_level",
      label: "Importance level",
      type: "select",
      options: optionValues(["critical", "important", "standard"]),
      required: true
    },
    { name: "notes", label: "Notes", type: "textarea" }
  ];
}

function createDependencyForm(systemId: number) {
  return {
    source_asset_id: String(systemId),
    destination_asset_id: "",
    relationship_description: "",
    data_or_service_exchanged: "",
    importance_level: "standard",
    notes: ""
  };
}

function createDependencyPayload(form: Record<string, string>): DirectoryRecord {
  return {
    source_asset_id: Number(form.source_asset_id),
    destination_asset_id: Number(form.destination_asset_id),
    relationship_description: form.relationship_description,
    data_or_service_exchanged: form.data_or_service_exchanged,
    importance_level: form.importance_level || "standard",
    notes: form.notes
  };
}

function createDirectoryForm(fields: DirectoryField[]) {
  return Object.fromEntries(
    fields.map((field) => [field.name, field.name === "importance_level" ? "standard" : ""])
  );
}

function recordToStringForm(record: DirectoryRecord) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, value === null ? "" : String(value)])
  );
}

function formToDirectoryRecord(form: Record<string, string>, fields?: DirectoryField[]): DirectoryRecord {
  const numericFields = new Set(fields?.filter((field) => field.type === "number" || field.systemSelect).map((field) => field.name));

  return Object.fromEntries(
    Object.entries(form).map(([key, value]) => [
      key,
      value.trim() === "" ? null : numericFields.has(key) ? Number(value) : value
    ])
  );
}

export function createEmptyForm(): SystemRecordFormInput {
  return {
    systemName: "",
    description: "",
    categoryCode: "",
    status: "active",
    businessDepartment: "",
    departmentOwner: "",
    technicalOwner: "",
    vendor: "",
    supportContact: "",
    hostingLocation: "",
    serverName: "",
    databaseName: "",
    productionUrl: "",
    testUrl: "",
    documentationLink: "",
    passwordVaultReference: "",
    renewalDate: "",
    lastReviewDate: "",
    replacementSystem: "",
    retirementNotes: "",
    notes: ""
  };
}

export function mapRecordToForm(record: SystemRecord): SystemRecordFormInput {
  return {
    systemName: record.system_name,
    description: record.description,
    categoryCode: record.category_code,
    status: record.status,
    businessDepartment: record.business_department ?? "",
    departmentOwner: record.department_owner ?? "",
    technicalOwner: record.technical_owner ?? "",
    vendor: record.vendor ?? "",
    supportContact: record.support_contact ?? "",
    hostingLocation: record.hosting_location ?? "",
    serverName: record.server_name ?? "",
    databaseName: record.database_name ?? "",
    productionUrl: record.production_url ?? "",
    testUrl: record.test_url ?? "",
    documentationLink: record.documentation_url ?? "",
    passwordVaultReference: record.password_vault_reference ?? "",
    renewalDate: record.renewal_date ?? "",
    lastReviewDate: record.last_review_date ?? "",
    replacementSystem: record.replacement_system ?? "",
    retirementNotes: record.retirement_notes ?? "",
    notes: record.notes ?? ""
  };
}

export function createEmptyVendorForm(): VendorFormInput {
  return {
    name: "",
    description: "",
    account_number: "",
    website_url: "",
    login_identifier: "",
    cyrious_name: "",
    terms_30_day: "",
    self_promo: "",
    rebate: "",
    nqp: "",
    aim: "",
    eqp_status_2023: "",
    eqp_status_2022: "",
    eqp_volume: "",
    payment_method: "",
    invoice_searches: "",
    csr_sales_rep: "",
    rep_direct_line: "",
    category: "",
    support_email: "",
    support_phone: "",
    support_portal_url: "",
    account_representative: "",
    contract_start_date: "",
    contract_end_date: "",
    renewal_notice_days: "",
    contract_notes: "",
    renewal_notes: "",
    notes: ""
  };
}

export function mapVendorToForm(vendor: Vendor): VendorFormInput {
  return {
    name: vendor.name,
    description: vendor.description ?? "",
    account_number: vendor.account_number ?? "",
    website_url: vendor.website_url ?? "",
    login_identifier: vendor.login_identifier ?? "",
    cyrious_name: vendor.cyrious_name ?? "",
    terms_30_day: vendor.terms_30_day === null ? "" : String(vendor.terms_30_day),
    self_promo: vendor.self_promo ?? "",
    rebate: vendor.rebate ?? "",
    nqp: vendor.nqp === null ? "" : String(vendor.nqp),
    aim: vendor.aim === null ? "" : String(vendor.aim),
    eqp_status_2023: vendor.eqp_status_2023 ?? "",
    eqp_status_2022: vendor.eqp_status_2022 ?? "",
    eqp_volume: vendor.eqp_volume ?? "",
    payment_method: vendor.payment_method ?? "",
    invoice_searches: vendor.invoice_searches ?? "",
    csr_sales_rep: vendor.csr_sales_rep ?? "",
    rep_direct_line: vendor.rep_direct_line ?? "",
    category: vendor.category ?? "",
    support_email: vendor.support_email ?? "",
    support_phone: vendor.support_phone ?? "",
    support_portal_url: vendor.support_portal_url ?? "",
    account_representative: vendor.account_representative ?? "",
    contract_start_date: vendor.contract_start_date ?? "",
    contract_end_date: vendor.contract_end_date ?? "",
    renewal_notice_days: vendor.renewal_notice_days === null ? "" : String(vendor.renewal_notice_days),
    contract_notes: vendor.contract_notes ?? "",
    renewal_notes: vendor.renewal_notes ?? "",
    notes: vendor.notes ?? ""
  };
}

export function mapApiIssues(error: ApiError) {
  if (error.issues.length === 0) {
    return {};
  }

  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path?.[0] ?? "form"), issue.message])
  );
}

function uniqueNonEmpty(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))].sort(
    (left, right) => left.localeCompare(right)
  );
}

function formatDate(value: string | null) {
  return formatNullableDate(value) ?? "No date";
}

function formatDirectoryValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Not recorded";
  }

  return String(value);
}

function formatDirectoryFieldValue(
  fieldName: string,
  value: string | number | null | undefined,
  systems: SystemRecord[]
) {
  if (fieldName.endsWith("_asset_id") || fieldName === "asset_id") {
    const system = systems.find((record) => record.id === Number(value));
    return system?.system_name ?? formatDirectoryValue(value);
  }

  return formatDirectoryValue(value);
}

function systemNameById(systems: SystemRecord[], id: string | number | null | undefined) {
  const system = systems.find((record) => record.id === Number(id));

  return system?.system_name ?? formatDirectoryValue(id);
}

function humanizeField(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNullableDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function formatBooleanLabel(value: 0 | 1 | null) {
  if (value === 1) {
    return "Yes";
  }

  if (value === 0) {
    return "No";
  }

  return null;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
