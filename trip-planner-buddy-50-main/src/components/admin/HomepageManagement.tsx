import { useState, useRef } from 'react';
import { Upload, Trash2, Plus, Image, Video } from 'lucide-react';
import { mockCarouselSlides, introVideoUrl } from '@/data/mockData';

const HomepageManagement = () => {
  const [videoUrl, setVideoUrl] = useState(introVideoUrl);
  const [slides, setSlides] = useState(mockCarouselSlides);
  const [logoPreview, setLogoPreview] = useState<string | null>(() => localStorage.getItem('siteLogo'));
  const logoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const slideInputRef = useRef<HTMLInputElement>(null);

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    localStorage.setItem('siteLogo', dataUrl);
    setLogoPreview(dataUrl);
    window.dispatchEvent(new Event('logoUpdated'));
  };

  const removeLogo = () => {
    localStorage.removeItem('siteLogo');
    setLogoPreview(null);
    window.dispatchEvent(new Event('logoUpdated'));
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setVideoUrl(dataUrl);
  };

  const handleSlideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const dataUrl = await fileToDataUrl(file);
      setSlides((prev) => [...prev, { id: Date.now().toString() + Math.random(), imageUrl: dataUrl }]);
    }
    if (slideInputRef.current) slideInputRef.current.value = '';
  };

  return (
    <div className="space-y-8">
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90"
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90"
          >
            <Video className="h-4 w-4" /> 上傳影片
          </button>
          {videoUrl && (
            <button
              onClick={() => setVideoUrl('')}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> 移除
            </button>
          )}
        </div>
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
            <button onClick={() => slideInputRef.current?.click()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm hover:opacity-90">
              <Plus className="h-4 w-4" /> 上傳圖片
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {slides.map((slide) => (
            <div key={slide.id} className="relative group rounded-lg overflow-hidden aspect-[3/2]">
              <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setSlides((p) => p.filter((s) => s.id !== slide.id))}
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
