import { useState, useRef, useEffect } from 'react';
import { Upload, Trash2, Plus, Image, Video, Save, Check } from 'lucide-react';
import { mockCarouselSlides, introVideoUrl } from '@/data/mockData';
import { supabase } from '@/lib/supabase';
import { SITE_NAME_STORAGE_KEY } from '@/lib/siteName';

type Slide = { id: string; imageUrl: string; title?: string };

const STORAGE_BUCKET = 'homepage-media';
const VIDEO_PATH = 'intro-video';
const LOGO_PATH = 'site-logo';

const HomepageManagement = () => {
  const [videoUrl, setVideoUrl] = useState(introVideoUrl);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [slides, setSlides] = useState<Slide[]>(mockCarouselSlides);
  const [siteName, setSiteName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const slideInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  // Prevents the initial Supabase fetch from overwriting state after the user has made changes.
  const hasUserInteractedRef = useRef(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('homepage_settings')
        .select('key, value')
        .in('key', ['carousel_slides', 'intro_video', 'site_logo', 'site_name']);
      if (error || hasUserInteractedRef.current) return;
      for (const row of data ?? []) {
        if (row.key === 'carousel_slides' && Array.isArray(row.value) && row.value.length > 0) {
          setSlides(row.value as Slide[]);
        }
        if (row.key === 'intro_video' && typeof row.value === 'string' && row.value) {
          setVideoUrl(row.value);
        }
        if (row.key === 'site_logo' && typeof row.value === 'string' && row.value) {
          setLogoPreview(row.value);
        }
        if (row.key === 'site_name' && typeof row.value === 'string' && row.value) {
          setSiteName(row.value);
        }
      }
      // 若資料庫沒有 LOGO，沿用 localStorage（相容舊資料）
      const hasLogoInRows = data?.some((r) => r.key === 'site_logo' && r.value);
      if (!hasLogoInRows) {
        const local = localStorage.getItem('siteLogo');
        if (local) setLogoPreview(local);
      }
    };
    fetchSettings();
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

  const markInteracted = () => {
    hasUserInteractedRef.current = true;
    setHasUnsavedChanges(true);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setLogoPreview(dataUrl);
    markInteracted();
  };

  const removeLogo = () => {
    setLogoPreview(null);
    markInteracted();
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const blobUrl = URL.createObjectURL(file);
    blobUrlRef.current = blobUrl;
    setPendingVideoFile(file);
    setVideoUrl(blobUrl);
    markInteracted();
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleVideoRemove = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPendingVideoFile(null);
    setVideoUrl('');
    markInteracted();
  };

  const handleSlideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const dataUrl = await fileToDataUrl(file);
      setSlides((prev) => [...prev, { id: Date.now().toString() + Math.random(), imageUrl: dataUrl }]);
    }
    markInteracted();
    if (slideInputRef.current) slideInputRef.current.value = '';
  };

  const removeSlide = (id: string) => {
    setSlides((prev) => prev.filter((s) => s.id !== id));
    markInteracted();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      // Logo → 上傳到 Storage，再存 URL 到資料庫（正式站與 localhost 共用）
      let logoUrlToSave: string | null = null;
      if (logoPreview) {
        if (logoPreview.startsWith('data:')) {
          const res = await fetch(logoPreview);
          const blob = await res.blob();
          const ext = blob.type.split('/')[1] || 'png';
          const fileName = `${LOGO_PATH}.${ext}`;
          await supabase.storage.from(STORAGE_BUCKET).remove([`${LOGO_PATH}.png`, `${LOGO_PATH}.jpg`, `${LOGO_PATH}.jpeg`, `${LOGO_PATH}.webp`]);
          const { error: upErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(fileName, blob, { contentType: blob.type, upsert: true });
          if (upErr) throw new Error(`LOGO 上傳失敗：${upErr.message}`);
          const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
          logoUrlToSave = `${urlData.publicUrl}?t=${Date.now()}`;
        } else {
          logoUrlToSave = logoPreview;
        }
      } else {
        await supabase.storage.from(STORAGE_BUCKET).remove([`${LOGO_PATH}.png`, `${LOGO_PATH}.jpg`, `${LOGO_PATH}.jpeg`, `${LOGO_PATH}.webp`]);
      }
      const { error: logoError } = await supabase
        .from('homepage_settings')
        .upsert({ key: 'site_logo', value: logoUrlToSave }, { onConflict: 'key' });
      if (logoError) throw new Error(`LOGO 儲存失敗：${logoError.message}`);
      if (logoPreview) localStorage.setItem('siteLogo', logoPreview);
      else localStorage.removeItem('siteLogo');
      window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoUrl: logoUrlToSave } }));

      // Video → Supabase Storage (only if a new file was selected)
      let finalVideoUrl = videoUrl;
      if (pendingVideoFile) {
        // Try uploading; if file already exists, remove it first then re-upload
        let { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(VIDEO_PATH, pendingVideoFile, { contentType: pendingVideoFile.type });
        if (uploadError?.message?.includes('already exists') || uploadError?.statusCode === '23505') {
          await supabase.storage.from(STORAGE_BUCKET).remove([VIDEO_PATH]);
          const retry = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(VIDEO_PATH, pendingVideoFile, { contentType: pendingVideoFile.type });
          uploadError = retry.error;
        }
        if (uploadError) {
          const hint = uploadError.message?.includes('Bucket not found') || uploadError.statusCode === '404'
            ? '請先在 Supabase Dashboard → Storage 建立名為「homepage-media」的公開 bucket'
            : uploadError.message;
          throw new Error(`影片上傳失敗：${hint}`);
        }
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(VIDEO_PATH);
        finalVideoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        setPendingVideoFile(null);
        setVideoUrl(finalVideoUrl);
      }

      // Video URL + Carousel → Supabase DB
      const [videoResult, slidesResult] = await Promise.all([
        supabase
          .from('homepage_settings')
          .upsert({ key: 'intro_video', value: finalVideoUrl }, { onConflict: 'key' }),
        supabase
          .from('homepage_settings')
          .upsert({ key: 'carousel_slides', value: slides }, { onConflict: 'key' }),
      ]);

      if (videoResult.error) throw new Error(`影片網址儲存失敗：${videoResult.error.message}`);
      if (slidesResult.error) throw new Error(`輪播圖儲存失敗：${slidesResult.error.message}`);

      const nameTrimmed = siteName.trim();
      const { error: siteNameError } = await supabase
        .from('homepage_settings')
        .upsert({ key: 'site_name', value: nameTrimmed || null }, { onConflict: 'key' });
      if (siteNameError) throw new Error(`網站名稱儲存失敗：${siteNameError.message}`);
      if (nameTrimmed) localStorage.setItem(SITE_NAME_STORAGE_KEY, nameTrimmed);
      else localStorage.removeItem(SITE_NAME_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('siteNameUpdated', { detail: { name: nameTrimmed } }));

      window.dispatchEvent(new Event('carouselUpdated'));
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '儲存失敗，請重試');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Global save bar */}
      <div className="flex items-center justify-between bg-card rounded-xl px-5 py-3 shadow-sm">
        <span className={`text-sm ${saveError ? 'text-destructive' : hasUnsavedChanges ? 'text-amber-500' : 'text-muted-foreground'}`}>
          {saveError ?? (hasUnsavedChanges ? '尚有未儲存的變更' : saveSuccess ? '所有變更已儲存' : '')}
        </span>
        <button
          onClick={handleSave}
          disabled={!hasUnsavedChanges || isSaving}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            hasUnsavedChanges
              ? 'bg-action text-action-foreground hover:bg-action/90'
              : 'bg-muted text-muted-foreground cursor-default'
          }`}
        >
          {isSaving ? (
            <><Save className="h-4 w-4 animate-pulse" /> 儲存中...</>
          ) : saveSuccess && !hasUnsavedChanges ? (
            <><Check className="h-4 w-4" /> 已儲存</>
          ) : (
            <><Save className="h-4 w-4" /> 儲存</>
          )}
        </button>
      </div>

      {/* Site name */}
      <div className="bg-card rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-foreground mb-4">網站名稱</h3>
        <input
          type="text"
          value={siteName}
          onChange={(e) => {
            setSiteName(e.target.value);
            markInteracted();
          }}
          aria-label="網站名稱"
          className="w-full max-w-md px-4 py-2.5 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
          placeholder="後台登入與側欄標題（未填則顯示「後台管理」）"
        />
      </div>

      {/* Logo */}
      <div className="bg-card rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-foreground mb-4">網站 LOGO</h3>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <div className="relative group">
              <img src={logoPreview} alt="Logo" className="h-16 max-w-[200px] object-contain rounded-lg border border-border p-1" />
              <button
                onClick={removeLogo}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="h-16 w-40 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
              <Image className="h-6 w-6" />
            </div>
          )}
          <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          <button
            onClick={() => logoInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-action text-action-foreground text-sm font-medium hover:bg-action/90"
          >
            <Upload className="h-4 w-4" /> 上傳 LOGO
          </button>
        </div>
      </div>

      {/* Video */}
      <div className="bg-card rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-foreground mb-4">進場動態影片</h3>
        <div className="flex items-center gap-4">
          <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
          <button
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-action text-action-foreground text-sm font-medium hover:bg-action/90"
          >
            <Video className="h-4 w-4" /> 上傳影片
          </button>
          {videoUrl && (
            <button
              onClick={handleVideoRemove}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> 移除
            </button>
          )}
        </div>
        {pendingVideoFile && (
          <p className="mt-2 text-xs text-muted-foreground">已選擇：{pendingVideoFile.name}（儲存後上傳至雲端）</p>
        )}
        {videoUrl && (
          <video src={videoUrl} className="mt-4 w-full max-w-md rounded-lg" controls muted />
        )}
      </div>

      {/* Carousel */}
      <div className="bg-card rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">輪播大圖 (1200×800)</h3>
          <div>
            <input ref={slideInputRef} type="file" accept="image/*" multiple onChange={handleSlideUpload} className="hidden" />
            <button
              onClick={() => slideInputRef.current?.click()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-action text-action-foreground text-sm hover:bg-action/90"
            >
              <Plus className="h-4 w-4" /> 上傳圖片
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {slides.map((slide) => (
            <div key={slide.id} className="relative group rounded-lg overflow-hidden aspect-[3/2]">
              <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeSlide(slide.id)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomepageManagement;
