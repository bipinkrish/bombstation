import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
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
    <div className="code-studio-layout">
      <div className="code-toolbar">
        <div className="code-toolbar-left">
          <span className="toolbar-label">File:</span>
          <select
            className="form-control-sm"
            value={activeFile || ''}
            onChange={(e) => e.target.value && loadFile(e.target.value)}
          >
            <option value="">-- Open File from Mods --</option>
            {filesList.map((f) => (
              <option key={f.path} value={f.path}>
                {f.name} {f.api ? `(API ${f.api})` : ''}
              </option>
            ))}
          </select>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setCode(DEFAULT_CODE);
              setActiveFile(null);
              showToast('Created new script workspace');
            }}
          >
            + New
          </button>

          <span className="toolbar-label" style={{ marginLeft: '6px' }}>
            Template:
          </span>
          <select
            className="form-control-sm"
            onChange={(e) => handleTemplateSelect(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>
              Choose Starter...
            </option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
        </div>

        <div className="code-toolbar-right">
          <button className="btn btn-secondary btn-sm" onClick={() => validateCode()}>
            Validate Syntax
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExport}
            title="Build distribution ZIP package via scripts/build_export.py"
          >
            Build &amp; Export
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleDeploy}>
            Save &amp; Deploy
          </button>
        </div>
      </div>

      <div className="editor-workspace">
        <Editor
          height="100%"
          defaultLanguage="python"
          theme="vs-dark"
          value={code}
          onChange={(val) => setCode(val || '')}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            minimap: { enabled: true },
            automaticLayout: true,
            lineHeight: 20,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>

      {/* Validation Tray */}
      <div className={`diagnostic-tray ${trayOpen ? 'open' : ''}`}>
        <div className="tray-header" onClick={() => setTrayOpen(!trayOpen)}>
          <div className="tray-title-group">
            {validation ? (
              !validation.valid ? (
                <span className="diag-status-pill error">✗ Syntax Error</span>
              ) : validation.warnings && validation.warnings.length > 0 ? (
                <span className="diag-status-pill warn">⚠ Notice</span>
              ) : (
                <span className="diag-status-pill success">✓ Valid API 9</span>
              )
            ) : (
              <span className="diag-status-pill success">✓ Ready</span>
            )}
            <span className="diag-text">
              {validation
                ? !validation.valid
                  ? `Line ${validation.syntax_error?.line}: ${validation.syntax_error?.message}`
                  : validation.warnings && validation.warnings.length > 0
                  ? `${validation.warnings.length} Ballistica API notice(s)`
                  : `Cleanly targets Ballistica API ${validation.api_target || 9}.`
                : 'Ballistica API 9 Validator ready.'}
            </span>
          </div>
        </div>

        {trayOpen && validation && (
          <div className="tray-body">
            {!validation.valid && validation.syntax_error && (
              <div className="diag-item error">
                Line {validation.syntax_error.line}: {validation.syntax_error.message} → "
                {validation.syntax_error.text}"
              </div>
            )}
            {validation.warnings?.map((w, idx) => (
              <div key={idx} className="diag-item warn">
                • {w}
              </div>
            ))}
            {validation.info?.map((inf, idx) => (
              <div key={idx} className="diag-item info">
                ✓ {inf}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
