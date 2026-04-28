import React, { useState, useEffect } from 'react';
import { 
  FileText, Upload, Download, Trash2, File, 
  Image as ImageIcon, FileCheck, Loader2, Plus, Eye, X 
} from 'lucide-react';
import { 
  Button, Card, CardContent, Typography, 
  IconButton, Tooltip, CircularProgress, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Stack, Divider
} from '@mui/material';
import toast from 'react-hot-toast';
import api from '../services/api';

interface FileDocument {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  module: string;
  referenceId: number;
}

interface DocumentManagerProps {
  module: 'LEAD' | 'INVENTORY' | 'FINANCE' | 'SERVICE';
  referenceId: number;
  title?: string;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ module, referenceId, title = "Documents" }) => {
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  const fetchFiles = async () => {
    if (!referenceId) return;
    try {
      setLoading(true);
      const res = await api.get(`/api/files/module/${module}/${referenceId}`);
      console.log(`Documents loaded for ${module} ID ${referenceId}:`, res.data);
      setFiles(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch files", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [module, referenceId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('module', module);
      formData.append('referenceId', referenceId.toString());

      await api.post('/api/files/upload', formData);

      toast.success("File uploaded successfully");
      setOpenUpload(false);
      setSelectedFile(null);
      fetchFiles();
    } catch (err) {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id: number, fileName: string) => {
    try {
      const response = await api.get(`/api/files/download/${id}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Failed to download file");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await api.delete(`/api/files/${id}`);
      toast.success("File deleted");
      fetchFiles();
    } catch (err) {
      toast.error("Failed to delete file");
    }
  };

  const handlePreview = async (file: FileDocument) => {
    try {
      const response = await api.get(`/api/files/download/${file.id}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: file.fileType }));
      
      if (file.fileType.includes('pdf')) {
        window.open(url, '_blank');
      } else {
        setPreviewUrl(url);
        setPreviewTitle(file.fileName);
        setPreviewOpen(true);
      }
    } catch (err) {
      toast.error("Failed to load preview");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    const safeType = type || '';
    if (safeType.includes('pdf')) return <FileText size={20} color="#ef4444" />;
    if (safeType.includes('image')) return <ImageIcon size={20} color="#3b82f6" />;
    return <File size={20} color="#94a3b8" />;
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 0, border: '1px solid #e2e8f0', bgcolor: '#fff', overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <FileCheck size={18} color="#0a0f1e" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0a0f1e' }}>
            {title}
          </Typography>
        </Stack>
        <Button 
          size="small" 
          variant="contained" 
          startIcon={<Plus size={16} />}
          onClick={() => setOpenUpload(true)}
          sx={{ 
            borderRadius: 0, 
            textTransform: 'none',
            bgcolor: '#0a0f1e',
            '&:hover': { bgcolor: '#1a2134' },
            fontSize: '0.75rem',
            py: 0.5
          }}
        >
          Upload
        </Button>
      </Box>

      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {loading ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
        ) : files.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#fff' }}>
            <Upload size={32} color="#cbd5e1" style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              No documents uploaded yet
            </Typography>
          </Box>
        ) : (
          <Stack divider={<Divider />}>
            {Array.isArray(files) && files.map((file) => (
              <Box key={file.id} sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', '&:hover': { bgcolor: '#f8fafc' } }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 0, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fff', flexShrink: 0 }}>
                    {getFileIcon(file.fileType)}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file?.fileName || 'Unnamed File'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      {formatFileSize(file?.fileSize || 0)}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Preview">
                    <IconButton size="small" onClick={() => handlePreview(file)}>
                      <Eye size={16} color="#64748b" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download">
                    <IconButton size="small" onClick={() => handleDownload(file.id, file.fileName)}>
                      <Download size={16} color="#0ea5e9" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => handleDelete(file.id)}>
                      <Trash2 size={16} color="#ef4444" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>

      <Dialog open={openUpload} onClose={() => !uploading && setOpenUpload(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>Upload Document</DialogTitle>
        <DialogContent>
          <Box 
            sx={{ 
              mt: 1, 
              border: '2px dashed #e2e8f0', 
              borderRadius: 0, 
              p: 4, 
              textAlign: 'center', 
              cursor: 'pointer',
              '&:hover': { borderColor: '#0a0f1e', bgcolor: '#f8fafc' },
              transition: 'all 0.2s ease'
            }}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <input 
              type="file" 
              id="fileInput" 
              style={{ display: 'none' }} 
              onChange={handleFileSelect}
            />
            {selectedFile ? (
              <Stack alignItems="center" spacing={1}>
                <FileCheck size={40} color="#22c55e" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedFile.name}</Typography>
                <Typography variant="caption" color="text.secondary">Click to change</Typography>
              </Stack>
            ) : (
              <Stack alignItems="center" spacing={1}>
                <Upload size={40} color="#94a3b8" />
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>Click to select file</Typography>
                <Typography variant="caption" color="text.secondary">PDF, JPG, PNG (Max 5MB)</Typography>
              </Stack>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setOpenUpload(false)} disabled={uploading} sx={{ borderRadius: 0 }}>Cancel</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            disabled={!selectedFile || uploading}
            startIcon={uploading ? <Loader2 className="animate-spin" /> : null}
            sx={{ borderRadius: 0, textTransform: 'none', bgcolor: '#0a0f1e', '&:hover': { bgcolor: '#1a2134' } }}
          >
            {uploading ? 'Uploading...' : 'Upload Now'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 0 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', py: 1.5 }}>
          {previewTitle}
          <IconButton size="small" onClick={() => setPreviewOpen(false)}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          {previewUrl && (
            <img 
              src={previewUrl} 
              alt={previewTitle} 
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} 
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DocumentManager;
