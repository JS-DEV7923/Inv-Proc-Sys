import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { useDocStore } from "../store/docStore";

type LocalUser = { id: string; name: string; role: "admin" | "reviewer" };

function Settings() {
  const threshold = useDocStore((s) => s.settings.confidenceThreshold);
  const setThreshold = useDocStore((s) => s.setConfidenceThreshold);

  const [apiKey, setApiKey] = useState("");
  const [apiBase, setApiBase] = useState("");
  const [huggingfaceApiKey, setHuggingfaceApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [users, setUsers] = useState<LocalUser[]>([]);

  useEffect(() => {
    const k = localStorage.getItem("settings.apiKey") ?? "";
    const b = localStorage.getItem("settings.apiBase") ?? "";
    const hfKey = localStorage.getItem("settings.huggingfaceApiKey") ?? "";
    const u = localStorage.getItem("settings.users");
    
    setApiKey(k);
    setApiBase(b);
    setHuggingfaceApiKey(hfKey);
    setUsers(u ? (JSON.parse(u) as LocalUser[]) : []);
  }, []);

  const onSaveIntegrations = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    
    try {
      // Validate Hugging Face API key if provided
      if (huggingfaceApiKey) {
        const isValid = await validateHuggingFaceKey(huggingfaceApiKey);
        if (!isValid) {
          setSaveStatus({ type: 'error', message: 'Invalid Hugging Face API key' });
          setIsSaving(false);
          return;
        }
      }
      
      // Save all settings
      localStorage.setItem("settings.apiKey", apiKey);
      localStorage.setItem("settings.apiBase", apiBase);
      localStorage.setItem("settings.huggingfaceApiKey", huggingfaceApiKey);
      
      setSaveStatus({ type: 'success', message: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
      
      // Clear success message after 3 seconds
      if (saveStatus?.type === 'success') {
        setTimeout(() => setSaveStatus(null), 3000);
      }
    }
  };

  const validateHuggingFaceKey = async (key: string): Promise<{ valid: boolean; message?: string }> => {
    // First, validate the key format
    if (!key) {
      return { valid: false, message: 'API key is required' };
    }
    
    if (!key.startsWith('hf_')) {
      return { valid: false, message: 'Invalid API key format: must start with hf_' };
    }

    if (key.length < 10) {
      return { valid: false, message: 'API key is too short' };
    }

    try {
      // Test the key with a simple API call
      const response = await fetch('https://huggingface.co/api/whoami', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('Hugging Face API error:', error);
        return { 
          valid: false, 
          message: error.error || 'Failed to validate API key' 
        };
      }
      
      return { valid: true };
    } catch (error) {
      console.error('Error validating Hugging Face key:', error);
      return { 
        valid: false, 
        message: 'Network error while validating API key' 
      };
    }
  };

  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "reviewer">("reviewer");
  const addUser = () => {
    if (!newUserName.trim()) return;
    const user: LocalUser = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, name: newUserName.trim(), role: newUserRole };
    const next = [...users, user];
    setUsers(next);
    localStorage.setItem("settings.users", JSON.stringify(next));
    setNewUserName("");
    setNewUserRole("reviewer");
  };
  const removeUser = (id: string) => {
    const next = users.filter((u) => u.id !== id);
    setUsers(next);
    localStorage.setItem("settings.users", JSON.stringify(next));
  };

  const thresholdPct = useMemo(() => Math.round(threshold * 100), [threshold]);

  // Add this helper function to mask the API key for display
  const getMaskedKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.substring(0, 4)}${'•'.repeat(key.length - 8)}${key.substring(key.length - 4)}`;
  };

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-8">
      <h1 className="text-2xl font-bold">Settings / Admin</h1>
      
      {/* Status Message */}
      {saveStatus && (
        <div className={`p-4 rounded-md ${saveStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {saveStatus.message}
        </div>
      )}

      {/* API Keys Section */}
      <div className="bg-card text-card-foreground p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">API Integrations</h2>
        
        <div className="space-y-4">
          {/* Existing API Key Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <div className="flex">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1 rounded-l-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your API key"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="bg-gray-100 px-3 rounded-r-md border border-l-0 border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Base URL
              </label>
              <input
                type="text"
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://api.example.com"
              />
            </div>
          </div>

          {/* Hugging Face API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hugging Face API Key
            </label>
            <div className="flex">
              <input
                type={showKey ? 'text' : 'password'}
                value={huggingfaceApiKey}
                onChange={(e) => setHuggingfaceApiKey(e.target.value)}
                className="flex-1 rounded-l-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your Hugging Face API key"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="bg-gray-100 px-3 rounded-r-md border border-l-0 border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {huggingfaceApiKey ? `Using key: ${getMaskedKey(huggingfaceApiKey)}` : 'No API key configured'}
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={onSaveIntegrations}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>

      {/* Confidence Threshold */}
      <div className="bg-card text-card-foreground p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Confidence Threshold</h2>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="flex-1"
          />
          <span className="w-16 text-center font-medium">{thresholdPct}%</span>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Documents with confidence below this threshold will be flagged for review.
        </p>
      </div>

      {/* User Management */}
      <div className="bg-card text-card-foreground p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">User Management</h2>
          <Button
            onClick={addUser}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Add User
          </Button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Full name"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value as any)}
          >
            <option value="reviewer">Reviewer</option>
            <option value="admin">Admin</option>
          </select>
          <Button 
            type="button" 
            onClick={addUser}
            className="w-full md:w-auto"
          >
            Add User
          </Button>
        </div>

        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left text-xs font-medium">Name</th>
                <th className="p-3 text-left text-xs font-medium">Role</th>
                <th className="p-3 text-left text-xs font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 space-x-2">
                    <Button variant="outline" size="sm" className="h-8">Edit</Button>
                    <Button variant="destructive" size="sm" className="h-8" onClick={() => removeUser(u.id)}>Remove</Button>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td className="p-4 text-center text-muted-foreground" colSpan={3}>No users yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 p-6 border border-red-200 bg-red-50 rounded-lg">
        <h3 className="text-lg font-medium text-red-800 mb-4">Danger Zone</h3>
        <p className="text-sm text-red-700 mb-4">
          This will permanently delete all your data, including documents, uploads, and settings.
          This action cannot be undone.
        </p>
        <Button
          variant="destructive"
          onClick={() => {
            if (window.confirm('Are you sure you want to reset all data? This cannot be undone.')) {
              useDocStore.getState().resetAll();
            }
          }}
        >
          Reset All Data
        </Button>
      </div>
    </div>
  );
}

export default Settings;
