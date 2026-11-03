import { useState, useRef, useCallback } from 'react';
import { 
  Paperclip, 
  Upload, 
  Trash2, 
  Download, 
  Eye, 
  FileText, 
  FileImage, 
  File, 
  X, 
  Search,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { useTaskStore } from '../../stores/taskStore';
import { WorkspaceDocument } from '../../lib/types';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return FileImage;
  if (fileType === 'application/pdf') return FileText;
  return File;
}

export const SharedDocuments = () => {
  const { currentWorkspace, documents, uploadDocument, deleteDocument } = useWorkspaceStore();
  const { user } = useAuthStore();
  const { tasks } = useTaskStore();

  const [search, setSearch] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<WorkspaceDocument | null>(null);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocs = documents.filter(doc => 
    doc.file_name.toLowerCase().includes(search.toLowerCase()) ||
    doc.uploaded_by_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (!currentWorkspace || !user) return;
    setUploadMsg(null);
    setUploading(true);

    const task = tasks.find(t => t.id === selectedTaskId);
    const fileArray = Array.from(files);

    try {
      for (const file of fileArray) {
        if (file.size > 10 * 1024 * 1024) {
          setUploadMsg({ type: 'error', text: `"${file.name}" exceeds 10MB limit.` });
          continue;
        }
        await uploadDocument(
          currentWorkspace.id, 
          file, 
          user, 
          selectedTaskId || null, 
          task?.title || null
        );
      }
      setUploadMsg({ type: 'success', text: 'Document(s) uploaded and shared successfully!' });
      setTimeout(() => setUploadMsg(null), 3000);
    } catch (err: any) {
      setUploadMsg({ type: 'error', text: err.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  }, [currentWorkspace, user, selectedTaskId, tasks, uploadDocument]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const downloadFile = (doc: WorkspaceDocument) => {
    const a = document.createElement('a');
    a.href = doc.data_url;
    a.download = doc.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = async (doc: WorkspaceDocument) => {
    if (!user) return;
    if (window.confirm(`Delete document "${doc.file_name}"? Both users will lose access.`)) {
      await deleteDocument(doc.id, user);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all bg-white ${
          isDragOver 
            ? 'border-primary-500 bg-primary-50/50' 
            : 'border-neutral-300 hover:border-primary-400'
        }`}
      >
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto text-primary-600">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-900 text-base">
              Upload Shared Workspace Documents
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Documents are instantly accessible by both workspace collaborators. Max 10MB per file.
            </p>
          </div>

          {/* Optional Task Linking */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="text-xs text-neutral-600 font-medium">Link to Task (optional):</span>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-neutral-50 outline-none max-w-[200px] truncate"
            >
              <option value="">No task (General Shared Doc)</option>
              {tasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
              }}
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition shadow-soft hover:shadow-medium disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Browse Files to Upload'}
            </button>
          </div>

          {uploadMsg && (
            <div className={`p-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 ${
              uploadMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {uploadMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {uploadMsg.text}
            </div>
          )}
        </div>
      </div>

      {/* Document Library Header & Search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Paperclip className="w-5 h-5 text-primary-500" />
          <h3 className="font-bold text-neutral-900 text-lg">
            Shared Documents Library ({documents.length})
          </h3>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents or uploaders..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Documents Grid / Table */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
          <Paperclip className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h4 className="font-semibold text-neutral-800 text-base">No shared documents found</h4>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            Upload project specs, designs, or guides above so both you and your collaborator can access them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const Icon = getFileIcon(doc.file_type);
            const isImg = doc.file_type.startsWith('image/');

            return (
              <div 
                key={doc.id}
                className="bg-white rounded-2xl p-4 border border-neutral-200 hover:border-primary-300 shadow-soft hover:shadow-medium transition group flex flex-col justify-between"
              >
                <div>
                  {/* File preview thumbnail if image */}
                  {isImg ? (
                    <div 
                      onClick={() => setPreviewDoc(doc)}
                      className="w-full h-36 bg-neutral-100 rounded-xl overflow-hidden mb-3 cursor-pointer group-hover:opacity-95 flex items-center justify-center border border-neutral-100 relative"
                    >
                      <img 
                        src={doc.data_url} 
                        alt={doc.file_name} 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1">
                        <Eye className="w-4 h-4" /> Click to Preview
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => setPreviewDoc(doc)}
                      className="w-full h-24 bg-neutral-50 rounded-xl mb-3 flex items-center justify-center border border-neutral-100 cursor-pointer"
                    >
                      <Icon className="w-10 h-10 text-primary-500" />
                    </div>
                  )}

                  {/* Title & Metadata */}
                  <h4 
                    onClick={() => setPreviewDoc(doc)}
                    className="font-bold text-neutral-900 text-sm truncate cursor-pointer hover:text-primary-600 transition" 
                    title={doc.file_name}
                  >
                    {doc.file_name}
                  </h4>

                  <div className="mt-2 space-y-1 text-xs text-neutral-500">
                    <div className="flex items-center justify-between">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-1 text-neutral-600 truncate pt-1 border-t border-neutral-100">
                      <User className="w-3.5 h-3.5 text-primary-500" />
                      <span>Uploaded by: <strong className="text-neutral-800">{doc.uploaded_by_name}</strong></span>
                    </div>

                    {doc.task_title && (
                      <div className="flex items-center gap-1 text-primary-600 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary-500" />
                        <span>Task: {doc.task_title}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100 flex items-center gap-1 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>
                    <button
                      onClick={() => downloadFile(doc)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary-600 hover:bg-primary-50 flex items-center gap-1 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>

                  <button
                    onClick={() => handleDelete(doc)}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-neutral-900 text-sm truncate max-w-md">
                  {previewDoc.file_name}
                </h3>
                <p className="text-xs text-neutral-500">
                  {formatFileSize(previewDoc.file_size)} • Uploaded by {previewDoc.uploaded_by_name}
                </p>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-auto flex items-center justify-center bg-neutral-900/5">
              {previewDoc.file_type.startsWith('image/') ? (
                <img 
                  src={previewDoc.data_url} 
                  alt={previewDoc.file_name} 
                  className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-medium" 
                />
              ) : previewDoc.file_type === 'application/pdf' ? (
                <iframe 
                  src={previewDoc.data_url} 
                  title={previewDoc.file_name}
                  className="w-full h-[60vh] rounded-lg border border-neutral-300" 
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-xl shadow-soft border border-neutral-200">
                  <File className="w-16 h-16 text-primary-500 mx-auto mb-3" />
                  <h4 className="font-bold text-neutral-800 text-base">{previewDoc.file_name}</h4>
                  <p className="text-xs text-neutral-500 mt-1">Direct in-browser preview not supported for this file type.</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
              <span className="text-xs text-neutral-500">
                Shared with all workspace members
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadFile(previewDoc)}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-soft"
                >
                  <Download className="w-4 h-4" />
                  Download File
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

