'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Video, ChevronRight, ChevronLeft, Download, FileText, File, Loader2, Plus, Trash2, Upload, Camera, GraduationCap, ClipboardList, Info } from 'lucide-react';
import { toast } from 'sonner';
import type { SessionType, FlippedClassSubtype, SessionEntry, DetailedEntry, ReportFormData } from '@/lib/types';
import { FLIPPED_CLASS_SUBTYPES } from '@/lib/types';
import { useAI } from '@/hooks/use-ai';
import { AIAssistButton } from '@/components/ai-assist-button';
import { AIStatusBadge } from '@/components/ai-status-badge';

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function createEmptySession(slNo: number): SessionEntry {
  return { id: generateId(), slNo, topic: '', date: '', subtype: FLIPPED_CLASS_SUBTYPES[0], duration: '', totalStudents: '' };
}

function createEmptyDetailed(slNo: number): DetailedEntry {
  return {
    id: generateId(), slNo, topic: '', date: '', subtype: FLIPPED_CLASS_SUBTYPES[0], duration: '', totalStudents: '',
    materialsShared: '', conductionWriteup: '', evaluationDetails: '', evaluationQuestions: '',
    performanceStats: '', outcome: '', posAndPsos: '', videoLink: '', learningOutcomes: '', curriculumGap: '', photoUrls: [],
  };
}

export function ReportFormWrapper() {
  const ai = useAI();
  const [step, setStep] = useState(0);
  const [sessionType, setSessionType] = useState<SessionType>('flipped_class');
  const [academicYear, setAcademicYear] = useState('');
  const [department, setDepartment] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [semesterSection, setSemesterSection] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [curriculumGap, setCurriculumGap] = useState('');
  const [sessions, setSessions] = useState<SessionEntry[]>([createEmptySession(1)]);
  const [detailedEntries, setDetailedEntries] = useState<DetailedEntry[]>([createEmptyDetailed(1)]);
  const [generating, setGenerating] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState<Record<string, boolean>>({});

  const steps = ['Session Type', 'Basic Info', 'Summary Table', 'Detailed Report', 'Download'];

  // Sync sessions count with detailed entries
  const syncDetailedEntries = (newSessions: SessionEntry[]) => {
    setDetailedEntries((prev: DetailedEntry[]) => {
      const updated = [...(prev ?? [])];
      while (updated.length < newSessions.length) {
        updated.push(createEmptyDetailed(updated.length + 1));
      }
      while (updated.length > newSessions.length) {
        updated.pop();
      }
      // Sync basic info from sessions
      return updated.map((d: DetailedEntry, i: number) => ({
        ...(d ?? {}),
        slNo: i + 1,
        topic: newSessions?.[i]?.topic ?? d?.topic ?? '',
        date: newSessions?.[i]?.date ?? d?.date ?? '',
        subtype: newSessions?.[i]?.subtype ?? d?.subtype ?? FLIPPED_CLASS_SUBTYPES[0],
        duration: newSessions?.[i]?.duration ?? d?.duration ?? '',
        totalStudents: newSessions?.[i]?.totalStudents ?? d?.totalStudents ?? '',
      } as DetailedEntry));
    });
  };

  const addSession = () => {
    const newSessions = [...(sessions ?? []), createEmptySession((sessions?.length ?? 0) + 1)];
    setSessions(newSessions);
    syncDetailedEntries(newSessions);
  };

  const removeSession = (index: number) => {
    if ((sessions?.length ?? 0) <= 1) return;
    const newSessions = (sessions ?? []).filter((_: any, i: number) => i !== index).map((s: SessionEntry, i: number) => ({ ...s, slNo: i + 1 }));
    setSessions(newSessions);
    syncDetailedEntries(newSessions);
  };

  const updateSession = (index: number, field: keyof SessionEntry, value: string) => {
    const newSessions = [...(sessions ?? [])];
    if (newSessions[index]) {
      (newSessions[index] as any)[field] = value;
      setSessions(newSessions);
      // Also sync topic/date/students to detailed entries
      if (['topic', 'date', 'subtype', 'duration', 'totalStudents'].includes(field)) {
        syncDetailedEntries(newSessions);
      }
    }
  };

  const updateDetailed = (index: number, field: keyof DetailedEntry, value: any) => {
    setDetailedEntries((prev: DetailedEntry[]) => {
      const updated = [...(prev ?? [])];
      if (updated[index]) {
        (updated[index] as any)[field] = value;
      }
      return updated;
    });
  };

  const handlePhotoUpload = async (entryIndex: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const entryId = detailedEntries?.[entryIndex]?.id ?? '';
    setUploadingPhotos((prev: Record<string, boolean>) => ({ ...(prev ?? {}), [entryId]: true }));

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        // Get presigned URL
        const presignRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: true }),
        });
        const presignData = await presignRes?.json?.() ?? {};
        const uploadUrl = presignData?.uploadUrl;
        const cloudPath = presignData?.cloud_storage_path;

        if (!uploadUrl || !cloudPath) {
          toast.error(`Failed to get upload URL for ${file?.name ?? 'file'}`);
          continue;
        }

        // Check signed headers
        const urlObj = new URL(uploadUrl);
        const signedHeaders = urlObj.searchParams.get('X-Amz-SignedHeaders') ?? '';
        const headers: Record<string, string> = { 'Content-Type': file.type };
        if (signedHeaders.includes('content-disposition')) {
          headers['Content-Disposition'] = 'attachment';
        }

        // Upload directly to S3
        const uploadRes = await fetch(uploadUrl, { method: 'PUT', headers, body: file });
        if (uploadRes?.ok) {
          newUrls.push(cloudPath);
        } else {
          toast.error(`Failed to upload ${file?.name ?? 'file'}`);
        }
      }

      if (newUrls.length > 0) {
        const existing = detailedEntries?.[entryIndex]?.photoUrls ?? [];
        updateDetailed(entryIndex, 'photoUrls', [...existing, ...newUrls]);
        toast.success(`${newUrls.length} photo(s) uploaded successfully`);
      }
    } catch (e: any) {
      console.error('Upload error:', e);
      toast.error('Failed to upload photos');
    } finally {
      setUploadingPhotos((prev: Record<string, boolean>) => ({ ...(prev ?? {}), [entryId]: false }));
    }
  };

  const removePhoto = (entryIndex: number, photoIndex: number) => {
    const existing = detailedEntries?.[entryIndex]?.photoUrls ?? [];
    const updated = existing.filter((_: string, i: number) => i !== photoIndex);
    updateDetailed(entryIndex, 'photoUrls', updated);
  };

  const buildFormData = (): ReportFormData => ({
    sessionType,
    academicYear: academicYear ?? '',
    department: department ?? '',
    subjectCode: subjectCode ?? '',
    courseName: courseName ?? '',
    semesterSection: semesterSection ?? '',
    preparedBy: preparedBy ?? '',
    curriculumGapIdentified: curriculumGap ?? '',
    sessions: sessions ?? [],
    detailedEntries: detailedEntries ?? [],
  });

  const handleDownload = async (format: 'docx' | 'pdf') => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: buildFormData(), format }),
      });

      if (!res?.ok) {
        const err = await res?.json?.().catch(() => ({})) ?? {};
        throw new Error(err?.error ?? 'Failed to generate report');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Report downloaded as ${format.toUpperCase()}`);
    } catch (e: any) {
      console.error('Download error:', e);
      toast.error(e?.message ?? 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return true;
    if (step === 1) return (academicYear ?? '').trim() && (department ?? '').trim() && (subjectCode ?? '').trim() && (courseName ?? '').trim() && (preparedBy ?? '').trim();
    if (step === 2) return (sessions ?? []).every((s: SessionEntry) => (s?.topic ?? '').trim() && (s?.date ?? '').trim() && (s?.totalStudents ?? '').trim());
    return true;
  };

  return (
    <div className="mt-8">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-1 mb-8">
        {steps.map((label: string, i: number) => (
          <div key={label} className="flex items-center gap-1">
            <button
              onClick={() => { if (i <= step) setStep(i); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                i === step
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : i < step
                  ? 'bg-primary/20 text-primary cursor-pointer hover:bg-primary/30'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border border-current">
                {i + 1}
              </span>
              <span className="hidden md:inline">{label}</span>
            </button>
            {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {step === 0 && (
            <div className="bg-card rounded-xl p-6 md:p-8" style={{ boxShadow: 'var(--shadow-md)' }}>
              <h2 className="font-display text-xl font-bold tracking-tight mb-1 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                Select Session Type
              </h2>
              <p className="text-sm text-muted-foreground mb-6">Choose the type of report to generate</p>
              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => setSessionType('flipped_class')}
                  className={`p-6 rounded-xl border-2 transition-all text-left group hover:shadow-lg ${
                    sessionType === 'flipped_class'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <BookOpen className={`w-8 h-8 mb-3 ${ sessionType === 'flipped_class' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                  <h3 className="font-display font-bold text-lg">Flipped Classroom</h3>
                  <p className="text-sm text-muted-foreground mt-1">Standard Inverted, Discussion, Demonstration, Group-based, or Flipping the Teacher</p>
                </button>
                <button
                  onClick={() => setSessionType('video_session')}
                  className={`p-6 rounded-xl border-2 transition-all text-left group hover:shadow-lg ${
                    sessionType === 'video_session'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <Video className={`w-8 h-8 mb-3 ${ sessionType === 'video_session' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                  <h3 className="font-display font-bold text-lg">Video Session</h3>
                  <p className="text-sm text-muted-foreground mt-1">Generate report for video-based teaching sessions with duration and learning outcomes</p>
                </button>
              </div>

              {sessionType === 'flipped_class' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6 p-4 rounded-lg bg-accent/50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Flipped Class Subtypes Available</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FLIPPED_CLASS_SUBTYPES.map((st: FlippedClassSubtype) => (
                      <span key={st} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">{st}</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">You can select the subtype for each session in the Summary Table step.</p>
                </motion.div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="bg-card rounded-xl p-6 md:p-8" style={{ boxShadow: 'var(--shadow-md)' }}>
              <h2 className="font-display text-xl font-bold tracking-tight mb-1 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Basic Information
              </h2>
              <p className="text-sm text-muted-foreground mb-6">Enter the course and faculty details</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Academic Year <span className="text-destructive">*</span></label>
                  <input
                    value={academicYear ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAcademicYear(e?.target?.value ?? '')}
                    placeholder="e.g., 2025-2026"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Department <span className="text-destructive">*</span></label>
                  <input
                    value={department ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepartment(e?.target?.value ?? '')}
                    placeholder="e.g., Computer Science"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Subject Code <span className="text-destructive">*</span></label>
                  <input
                    value={subjectCode ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubjectCode(e?.target?.value ?? '')}
                    placeholder="e.g., 21CS51"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Course Name <span className="text-destructive">*</span></label>
                  <input
                    value={courseName ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCourseName(e?.target?.value ?? '')}
                    placeholder="e.g., Data Structures"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Semester / Section <span className="text-destructive">*</span></label>
                  <input
                    value={semesterSection ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSemesterSection(e?.target?.value ?? '')}
                    placeholder="e.g., 5th Sem / A Section"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Prepared By <span className="text-destructive">*</span></label>
                  <input
                    value={preparedBy ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPreparedBy(e?.target?.value ?? '')}
                    placeholder="Faculty name"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Curriculum Gap Identified</label>
                  <textarea
                    value={curriculumGap ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCurriculumGap(e?.target?.value ?? '')}
                    placeholder="Describe the curriculum gap addressed by these sessions..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-card rounded-xl p-6 md:p-8" style={{ boxShadow: 'var(--shadow-md)' }}>
              <h2 className="font-display text-xl font-bold tracking-tight mb-1 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Summary Table
              </h2>
              <p className="text-sm text-muted-foreground mb-6">Add each session/class you conducted. These will form the summary table in the report.</p>

              <div className="space-y-4">
                {(sessions ?? []).map((session: SessionEntry, idx: number) => (
                  <motion.div
                    key={session?.id ?? idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-primary">Session #{idx + 1}</span>
                      {(sessions?.length ?? 0) > 1 && (
                        <button onClick={() => removeSession(idx)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Topic *</label>
                        <input
                          value={session?.topic ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSession(idx, 'topic', e?.target?.value ?? '')}
                          placeholder="Topic name"
                          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Date *</label>
                        <input
                          type="date"
                          value={session?.date ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSession(idx, 'date', e?.target?.value ?? '')}
                          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      {sessionType === 'flipped_class' ? (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Subtype</label>
                          <select
                            value={session?.subtype ?? FLIPPED_CLASS_SUBTYPES[0]}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateSession(idx, 'subtype', e?.target?.value ?? '')}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            {FLIPPED_CLASS_SUBTYPES.map((st: FlippedClassSubtype) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Duration</label>
                          <input
                            value={session?.duration ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSession(idx, 'duration', e?.target?.value ?? '')}
                            placeholder="e.g., 45 mins"
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Total Students *</label>
                        <input
                          value={session?.totalStudents ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSession(idx, 'totalStudents', e?.target?.value ?? '')}
                          placeholder="e.g., 60"
                          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <button
                onClick={addSession}
                className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Session
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-card rounded-xl p-6 md:p-8" style={{ boxShadow: 'var(--shadow-md)' }}>
                <div className="flex items-start justify-between gap-4 mb-1">
                  <h2 className="font-display text-xl font-bold tracking-tight flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Detailed Report
                  </h2>
                  <AIStatusBadge
                    configured={ai.status.configured}
                    available={ai.status.available}
                    model={ai.status.model}
                    loading={ai.loading}
                  />
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  {sessionType === 'flipped_class'
                    ? 'Provide materials, conduction details, evaluation, and outcomes for each session.'
                    : 'Provide video links, learning outcomes, and details for each session.'}
                  {ai.status.available && (
                    <span className="ml-1 text-violet-600 dark:text-violet-400">✨ AI Assist is available — look for the purple buttons to auto-generate content.</span>
                  )}
                </p>
              </div>

              {(detailedEntries ?? []).map((entry: DetailedEntry, idx: number) => (
                <motion.div
                  key={entry?.id ?? idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-card rounded-xl p-6 md:p-8" style={{ boxShadow: 'var(--shadow-md)' }}
                >
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                    <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">{idx + 1}</span>
                    <div>
                      <h3 className="font-bold">{entry?.topic || `Session #${idx + 1}`}</h3>
                      <p className="text-xs text-muted-foreground">{entry?.date ?? ''} {sessionType === 'flipped_class' ? `• ${entry?.subtype ?? ''}` : `• ${entry?.duration ?? ''}`} • {entry?.totalStudents ?? '0'} students</p>
                    </div>
                  </div>

                  {sessionType === 'flipped_class' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Materials Shared Before Class</label>
                        <textarea
                          value={entry?.materialsShared ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateDetailed(idx, 'materialsShared', e?.target?.value ?? '')}
                          placeholder="Describe materials shared with students before class (PPTs, videos, readings, etc.)..."
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-sm font-medium block">Conduction of Flipped Classroom</label>
                          <AIAssistButton
                            aiAvailable={ai.status.available}
                            label="Generate"
                            disabled={!(entry?.topic ?? '').trim()}
                            onGenerate={() => ai.generate('conduction_writeup', {
                              topic: entry?.topic ?? '',
                              subtype: entry?.subtype ?? '',
                              totalStudents: entry?.totalStudents ?? '',
                              materialsShared: entry?.materialsShared ?? '',
                            })}
                            onApply={(content) => updateDetailed(idx, 'conductionWriteup', content)}
                          />
                        </div>
                        <textarea
                          value={entry?.conductionWriteup ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateDetailed(idx, 'conductionWriteup', e?.target?.value ?? '')}
                          placeholder="Describe how the flipped classroom was conducted..."
                          rows={4}
                          className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </div>

                      {/* Photo Upload */}
                      <div>
                        <label className="text-sm font-medium mb-1.5 block flex items-center gap-2">
                          <Camera className="w-4 h-4 text-primary" />
                          Classroom Photos
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(entry?.photoUrls ?? []).map((url: string, pi: number) => (
                            <div key={pi} className="relative w-20 h-20 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                              <Camera className="w-6 h-6" />
                              <button
                                onClick={() => removePhoto(idx, pi)}
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors">
                          {uploadingPhotos?.[entry?.id ?? ''] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {uploadingPhotos?.[entry?.id ?? ''] ? 'Uploading...' : 'Upload Photos'}
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePhotoUpload(idx, e?.target?.files ?? null)}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Evaluation Details</label>
                        <textarea
                          value={entry?.evaluationDetails ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateDetailed(idx, 'evaluationDetails', e?.target?.value ?? '')}
                          placeholder="Quiz/Assignment/Class test details. Include questions from higher-order Bloom's levels (L3-L5)..."
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-sm font-medium block">Evaluation Questions with Bloom&apos;s Level</label>
                          <AIAssistButton
                            aiAvailable={ai.status.available}
                            label="Generate Questions"
                            disabled={!(entry?.topic ?? '').trim()}
                            onGenerate={() => ai.generate('evaluation_questions', {
                              topic: entry?.topic ?? '',
                              subtype: entry?.subtype ?? '',
                              count: 5,
                            })}
                            onApply={(content) => updateDetailed(idx, 'evaluationQuestions', content)}
                          />
                        </div>
                        <textarea
                          value={entry?.evaluationQuestions ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateDetailed(idx, 'evaluationQuestions', e?.target?.value ?? '')}
                          placeholder="List evaluation questions with their Bloom's level (e.g., Q1 [L3-Apply]: ...)..."
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Performance Statistics</label>
                        <textarea
                          value={entry?.performanceStats ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateDetailed(idx, 'performanceStats', e?.target?.value ?? '')}
                          placeholder="Statistics and graphs of performance (from Google Form or evaluation)..."
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Outcome</label>
                          <textarea
                            value={entry?.outcome ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateDetailed(idx, 'outcome', e?.target?.value ?? '')}
                            placeholder="Outcome of the flipped classroom. Mention higher-order Bloom's levels achieved (L3, L4, L5)..."
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-medium block">POs and PSOs Addressed</label>
                            <AIAssistButton
                              aiAvailable={ai.status.available}
                              label="Suggest POs/PSOs"
                              disabled={!(entry?.topic ?? '').trim()}
                              onGenerate={() => ai.generate('pos_psos', {
                                topic: entry?.topic ?? '',
                                courseName: courseName ?? '',
                                department: department ?? '',
                              })}
                              onApply={(content) => updateDetailed(idx, 'posAndPsos', content)}
                            />
                          </div>
                          <textarea
                            value={entry?.posAndPsos ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateDetailed(idx, 'posAndPsos', e?.target?.value ?? '')}
                            placeholder="List POs and PSOs addressed by this session..."
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Video Session Link</label>
                        <input
                          value={entry?.videoLink ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDetailed(idx, 'videoLink', e?.target?.value ?? '')}
                          placeholder="https://..."
                          className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      {/* Photo Upload */}
                      <div>
                        <label className="text-sm font-medium mb-1.5 block flex items-center gap-2">
                          <Camera className="w-4 h-4 text-primary" />
                          Session Photos
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {(entry?.photoUrls ?? []).map((url: string, pi: number) => (
                            <div key={pi} className="relative w-20 h-20 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                              <Camera className="w-6 h-6" />
                              <button
                                onClick={() => removePhoto(idx, pi)}
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors">
                          {uploadingPhotos?.[entry?.id ?? ''] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {uploadingPhotos?.[entry?.id ?? ''] ? 'Uploading...' : 'Upload Photos'}
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePhotoUpload(idx, e?.target?.files ?? null)}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-sm font-medium block">Learning Outcomes</label>
                          <AIAssistButton
                            aiAvailable={ai.status.available}
                            label="Generate Outcomes"
                            disabled={!(entry?.topic ?? '').trim()}
                            onGenerate={() => ai.generate('learning_outcomes', {
                              topic: entry?.topic ?? '',
                              duration: entry?.duration ?? '',
                            })}
                            onApply={(content) => updateDetailed(idx, 'learningOutcomes', content)}
                          />
                        </div>
                        <textarea
                          value={entry?.learningOutcomes ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateDetailed(idx, 'learningOutcomes', e?.target?.value ?? '')}
                          placeholder="Describe the learning outcomes of the video session..."
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Curriculum Gap Addressed</label>
                        <textarea
                          value={entry?.curriculumGap ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateDetailed(idx, 'curriculumGap', e?.target?.value ?? '')}
                          placeholder="If the video session addresses a curriculum gap, mention it here..."
                          rows={2}
                          className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-medium block">POs and PSOs Addressed</label>
                            <AIAssistButton
                              aiAvailable={ai.status.available}
                              label="Suggest POs/PSOs"
                              disabled={!(entry?.topic ?? '').trim()}
                              onGenerate={() => ai.generate('pos_psos', {
                                topic: entry?.topic ?? '',
                                courseName: courseName ?? '',
                                department: department ?? '',
                              })}
                              onApply={(content) => updateDetailed(idx, 'posAndPsos', content)}
                            />
                          </div>
                          <textarea
                            value={entry?.posAndPsos ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateDetailed(idx, 'posAndPsos', e?.target?.value ?? '')}
                            placeholder="List POs and PSOs addressed..."
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">Outcome</label>
                          <textarea
                            value={entry?.outcome ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateDetailed(idx, 'outcome', e?.target?.value ?? '')}
                            placeholder="Mention the outcome of the video session..."
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="bg-card rounded-xl p-6 md:p-8 text-center" style={{ boxShadow: 'var(--shadow-md)' }}>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-display text-2xl font-bold tracking-tight mb-2">Report Ready!</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Your {sessionType === 'flipped_class' ? 'Flipped Classroom' : 'Video Session'} report is ready for download.
                  Choose your preferred format below.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={() => handleDownload('docx')}
                    disabled={generating}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <File className="w-5 h-5" />}
                    Download as Word (.docx)
                  </button>
                  <button
                    onClick={() => handleDownload('pdf')}
                    disabled={generating}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-secondary text-secondary-foreground font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                    Download as PDF
                  </button>
                </div>

                {generating && (
                  <p className="text-sm text-muted-foreground mt-4 animate-pulse">Generating your report, please wait...</p>
                )}
              </motion.div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="px-5 py-2.5 rounded-lg bg-muted text-foreground font-medium text-sm flex items-center gap-2 hover:bg-muted/80 transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        {step < 4 && (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
