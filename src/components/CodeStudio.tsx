import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  FileCode,
  Plus,
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  Upload,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { api, StudioTemplate, ValidationReport } from '../services/api';

interface CodeStudioProps {
  modsPath: string;
  initialFile: string | null;
  showToast: (msg: string) => void;
}

const DEFAULT_CODE = `# ba_meta require api 9
"""
BombStation Studio: Ballistica Modding IDE
Ready to build custom mini-games, powerups, and character skins!
"""
from __future__ import annotations

import babase
import bascenev1

# Select a template from above or start typing code here...
`;

export const CodeStudio: React.FC<CodeStudioProps> = ({
  modsPath,
  initialFile,
  showToast,
}) => {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [templates, setTemplates] = useState<StudioTemplate[]>([]);
  const [filesList, setFilesList] = useState<any[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);

  useEffect(() => {
    api.getTemplates().then((res) => setTemplates(res.templates || [])).catch(console.error);
    loadFileList();
  }, [modsPath]);

  useEffect(() => {
    if (initialFile) {
      loadFile(`${modsPath}/${initialFile}`);
    }
  }, [initialFile]);

  const loadFileList = async () => {
    try {
      const res = await api.getStudioFiles(modsPath);
      setFilesList(res.files || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFile = async (path: string) => {
    showToast(`Loading ${path.split('/').pop()}...`);
    try {
      const res = await api.loadStudioFile(path);
      if (res.content !== undefined) {
        setCode(res.content);
        setActiveFile(res.path);
        showToast(`Loaded: ${res.filename}`);
        validateCode(res.content);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setCode(tpl.code);
      setActiveFile(null);
      showToast(`Loaded template: ${tpl.name}`);
      validateCode(tpl.code);
    }
  };

  const validateCode = async (codeToValidate: string = code) => {
    try {
      const report = await api.validateCode(codeToValidate);
      setValidation(report);
      if (!report.valid || (report.warnings && report.warnings.length > 0)) {
        setTrayOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeploy = async () => {
    let filename = activeFile ? activeFile.split('/').pop() : 'custom_arena_mod.py';
    showToast(`Deploying ${filename} to mods...`);
    try {
      const res = await api.saveStudioFile(modsPath, filename || 'custom_arena_mod.py', code);
      if (res.success) {
        showToast(`Deployed: ${res.filename}`);
        setActiveFile(res.path);
        loadFileList();
      }
    } catch (err: any) {
      showToast(`Deploy error: ${err.message}`);
    }
  };

  const handleExport = async () => {
    if (!activeFile) {
      showToast('Please save your script first to export distribution package.');
      return;
    }
    showToast('Building distribution ZIP via build_export pipeline...');
    try {
      const res = await api.exportMod(activeFile, false);
      if (res.success) {
        const manifest = res.manifest;
        showToast(`Exported: ${manifest.package_zip.split('/').pop()} (${manifest.package_size_bytes} bytes)`);
      } else {
        showToast(`Export failed: ${res.error}`);
      }
    } catch (err: any) {
      showToast(`Export error: ${err.message}`);
    }
  };

  return (
    <div className="code-studio-container">
      {/* IDE Top Toolbar */}
      <div className="macos-card code-studio-toolbar">
        <div className="toolbar-left-cluster">
          <div className="toolbar-picker-wrap">
            <FileCode size={13} className="picker-icon" />
            <select
              className="macos-toolbar-select"
              value={activeFile || ''}
              onChange={(e) => e.target.value && loadFile(e.target.value)}
            >
              <option value="">-- Active Mods Scripts --</option>
              {filesList.map((f) => (
                <option key={f.path} value={f.path}>
                  {f.name} {f.api ? `(API ${f.api})` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            className="macos-secondary-btn mini-btn"
            onClick={() => {
              setCode(DEFAULT_CODE);
              setActiveFile(null);
              showToast('Created new script workspace');
            }}
            title="Create blank script"
          >
            <Plus size={13} />
            <span>New</span>
          </button>

          <div className="toolbar-separator" />

          <div className="toolbar-picker-wrap">
            <Layers size={13} className="picker-icon" />
            <select
              className="macos-toolbar-select"
              onChange={(e) => handleTemplateSelect(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>
                Choose Starter Template...
              </option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="toolbar-right-cluster">
          <button
            className="macos-secondary-btn mini-btn"
            onClick={() => validateCode()}
            title="Inspect AST for Ballistica API 9 conformance"
          >
            <CheckCircle2 size={13} />
            <span>Validate</span>
          </button>

          <button
            className="macos-secondary-btn mini-btn"
            onClick={handleExport}
            title="Build distribution ZIP package via scripts/build_export.py"
          >
            <Package size={13} />
            <span>Build &amp; Export</span>
          </button>

          <button
            className="macos-btn macos-btn-primary mini-btn"
            onClick={handleDeploy}
            title="Save and deploy directly into mods folder"
          >
            <Upload size={13} />
            <span>Deploy</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="monaco-host-wrapper">
        <Editor
          height="100%"
          defaultLanguage="python"
          theme="vs-dark"
          value={code}
          onChange={(val) => setCode(val || '')}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
            minimap: { enabled: true, maxColumn: 80 },
            automaticLayout: true,
            lineHeight: 21,
            padding: { top: 14, bottom: 14 },
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
          }}
        />
      </div>

      {/* Slide-up Diagnostics Tray */}
      <div className={`diagnostic-dock ${trayOpen ? 'open' : ''}`}>
        <div className="dock-header" onClick={() => setTrayOpen(!trayOpen)}>
          <div className="dock-title-cluster">
            {validation ? (
              !validation.valid ? (
                <span className="macos-badge danger">
                  <XCircle size={11} /> Syntax Error
                </span>
              ) : validation.warnings && validation.warnings.length > 0 ? (
                <span className="macos-badge warning">
                  <AlertTriangle size={11} /> Notice
                </span>
              ) : (
                <span className="macos-badge success">
                  <CheckCircle2 size={11} /> Valid API 9
                </span>
              )
            ) : (
              <span className="macos-badge neutral">
                <CheckCircle2 size={11} /> AST Validator Ready
              </span>
            )}
            <span className="dock-summary">
              {validation
                ? !validation.valid
                  ? `Line ${validation.syntax_error?.line}: ${validation.syntax_error?.message}`
                  : validation.warnings && validation.warnings.length > 0
                  ? `${validation.warnings.length} Ballistica API notice(s)`
                  : `Cleanly targets Ballistica API ${validation.api_target || 9}.`
                : 'Ballistica API 9 syntax validation active.'}
            </span>
          </div>

          <div className="dock-toggle-indicator">
            {trayOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </div>
        </div>

        {trayOpen && validation && (
          <div className="dock-content-area custom-scroll">
            {!validation.valid && validation.syntax_error && (
              <div className="diag-entry error">
                <XCircle size={13} />
                <span>
                  Line {validation.syntax_error.line}: {validation.syntax_error.message} → "
                  {validation.syntax_error.text}"
                </span>
              </div>
            )}
            {validation.warnings?.map((w, idx) => (
              <div key={idx} className="diag-entry warning">
                <AlertTriangle size={13} />
                <span>{w}</span>
              </div>
            ))}
            {validation.info?.map((inf, idx) => (
              <div key={idx} className="diag-entry success">
                <CheckCircle2 size={13} />
                <span>{inf}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
