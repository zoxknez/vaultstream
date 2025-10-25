import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { config } from '../config/environment';
import progressService from '../services/progressService';

const LANGUAGE_MAP = {
  eng: 'English',
  spa: 'Spanish',
  fre: 'French',
  ger: 'German',
  ita: 'Italian',
  por: 'Portuguese',
  rus: 'Russian',
  jpn: 'Japanese',
  kor: 'Korean',
  chi: 'Chinese',
  ara: 'Arabic',
  hin: 'Hindi',
  tha: 'Thai',
  tur: 'Turkish',
  dut: 'Dutch',
  swe: 'Swedish',
  nor: 'Norwegian',
  dan: 'Danish',
  fin: 'Finnish',
  pol: 'Polish',
  cze: 'Czech',
  hun: 'Hungarian',
  gre: 'Greek',
  heb: 'Hebrew',
  rum: 'Romanian',
  sdh: 'English (SDH)'
};

const convertSrtTextToVtt = (srtText) => {
  const normalized = srtText.replace(/\r+/g, '').trim();
  const converted = normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return `WEBVTT\n\n${converted}`;
};

// Apply time offset to VTT subtitle
const applyOffsetToVtt = (vttContent, offsetMs) => {
  if (!offsetMs || offsetMs === 0) return vttContent;

  const lines = vttContent.split('\n');
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match timestamp line: "00:00:12.340 --> 00:00:15.430"
    const timestampMatch = line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})/);
    
    if (timestampMatch) {
      const startTime = timestampMatch[1];
      const endTime = timestampMatch[2];
      
      const newStartTime = adjustTimestamp(startTime, offsetMs);
      const newEndTime = adjustTimestamp(endTime, offsetMs);
      
      result.push(`${newStartTime} --> ${newEndTime}`);
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
};

// Convert timestamp to milliseconds
const timestampToMs = (timestamp) => {
  const parts = timestamp.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const secondsAndMs = parts[2].split('.');
  const seconds = parseInt(secondsAndMs[0], 10);
  const milliseconds = parseInt(secondsAndMs[1], 10);
  
  return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
};

// Convert milliseconds to timestamp
const msToTimestamp = (ms) => {
  // Ensure non-negative
  const totalMs = Math.max(0, ms);
  
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const milliseconds = totalMs % 1000;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};

// Adjust a single timestamp by offset
const adjustTimestamp = (timestamp, offsetMs) => {
  const ms = timestampToMs(timestamp);
  const adjustedMs = ms + offsetMs;
  return msToTimestamp(adjustedMs);
};

const extractLanguageFromFilename = (filename = '') => {
  const lower = filename.toLowerCase();

  for (const [code, language] of Object.entries(LANGUAGE_MAP)) {
    if (lower.includes(code) || lower.includes(language.toLowerCase())) {
      return language;
    }
  }

  return 'Unknown';
};

const extractMediaName = (input = '') => {
  if (!input) return '';

  let name = input.replace(/\.[^/.]+$/, '');
  name = name.replace(/\b(720p|1080p|1440p|2160p|4K|HD|CAM|TS|TC|SCR|DVDSCR|DVDRIP|HDTV|PDTV|DSR|WORKPRINT|VHS|TV|TVRIP|VOD|WEB-DL|WEBDL|WEBRip|WEB-Rip|BluRay|BDRip|BRRip|HDCAM|HDTS|DVDR|R3|R5|R6|PPVRIP|REMUX)\b/gi, '');
  name = name.replace(/\b(YIFY|YTS|RARBG|EZTV|ETTV|TorrentGalaxy|1337x|CMRG|FGT|CHD|HDChina|WiKi|DON|NTb|DIMENSION|LOL|ASAP|SVA|KILLERS|ROVERS|RARBG|SPARKS|TBS|CRiMSON|AMRAP|CTU|FoV|JYK|GECKOS|IMMERSE|DRONES|AMIABLE|playBD|decibeL|EA|EbP|ESiR|EXViD|FxM|FZERO|GECKOS|GFY|GoGo|mSD|NeDiVx|nmd|PUKKA|QiM|RUBY|SAiMORNY|SHUTTIT|SiRiUS|UKB5|WAF|x0r|YMG|ZOOE|APL|ARAXIAL|DEViSE|DiSPOSABLE|DVL|EwDp|FFNDVD|FRAGMENT|Larceny|MESS|MOKONA|nVID|REAKTOR|REWARD|RUSH|Replica|SECTOR7|Skazhutin|STUCK|SWTYBLZ|TLF|Waf4rr0k|WAR|WISDOM|YARN|ZmN|iMBT|pov|xxop|KLAXXON|SAPHiRE|TOPAZ|CiNEFiLE|Japhson|KiMCHi|LLoRd|mfcorrea|NaRaYa|Noir|PRODJi|PSYCHD|pukka|QaFoNE|RayRep|SECTOR7|SiNK|ViTE|WAF|WASTE|x0r|YIFY|3LT0N|4yEo|Ac3|ADTRG|AFG|AGRY|AKRAKEN|ALANiS|AliKaDee|ALLiANCE|AMIABLE|AN0NYM0US|AOV|ARK01|ARROW|AXiNE|BestDivX|BIB|BINGO|BRMP|BTSFilms|Bushi|CaKePiPe|CD1|CD2|Cd3|CdRip|CHiCaNo|CiCXXX|CLUE|CNXP|CODEiNE|compcompletos|CopStuff|CPOTT|CPUL|CrAcKrOoKz|CRF|CRiSC|CRiTiCAL|CRYS|CTU|DaBaum|DarkScene|DataHead|DCS|DEF|DELUCIDATION|DeWMaN|DHD|DiAMOND|DiSSOLVE|DivXNL|DMZ|DON|DROiD|DTL|DTS|DVDFab|DVDnL|DVL|DXO|e.t.|EB|EbP|ECI|ELiA|EMERALD|EmX|EncodeLounge|ENTiTY|EPiK|ESiR|ETM|EVL|EwDp|ExtraScene|FARG|FASTSUB|Fertili|FiHTV|FiNaLe|FLoW|FnF|FooKaS|FOR|Forest|FoREST|FoRM|FoV|FRAGMENT|FuN|FXG|Ganool|GAZ|GBM|GDB|GHoST|GIBBY|GNome|GoGo|HaB|HACKS|HANDJOB|HigH|HSBS|idMKv|iGNiTiON|iGNORANT|iHD|iLG|IMB|INSPiRAL|IRANiAN|iRiSH|iron|iTALiAN|iTS|iXA|JAV|KeepFRDS|KiCKAZZ|KNiGHTS|KODAK|Krautspatzen|LANR|LAP|Lat|Lbtag|LIME|LiNKLE|LiViNG|LLG|LoRD|LoVE|LTRG|LTT|Lu|m1080p|M7PLuS|maz123|METiS|MF|MFCORREA|MIFUNE|MoH|MOLECULE|MOViEFiNATiCS|MOViERUSH|MP3|mSD|MSTV|MTB|Multi|MURPHYDVD|Mx|MYSTIC|NaRaYa|nCRO|NEMESIS|nEO|NESSUNDA|NETWORK|NFO|NhaNc3|NIKAPBDK|NineDragons|Nitrous|Noir|NORDiC|NOTiOS|NOX|nTrO|OCW|Otwieracz|P2P|PARTYBOY|PBDA|PHOCiS|PHOENA|PKF|PLAY|PLEX|PODiUM|POiNT|POISON|pov|PRE|PREMiUM|PRISM|PRoDJi|PROPER|PROVOKE|PSV|Pt|PUKKA|Pure|PYRo|QaFoNE|RAZZ|REAdNFO|REALLY|RECODED|REFiNED|ReleaseLounge|RENTS|REPLICA|REPTiLE|RETAiL|REVEiLLE|RFB|RG|Rio|RMVB|RNT|ROFL|RsL|RSG|RUBY|RUS|rydal|S4A|SAPHiRE|SAZ|SCOrp|ScREEN|SDDAZ|SDE|SDO|SECTOR7|SEEDiG|ShAaNiG|SHITBUSTERS|SHORTBREHD|SiLK|SiNG|SkAzHuTiN|SKiP|Slay3R|SMY|SPARKS|SPiKET|SPOOKS|SQU|SSDD|STUCK|SUBTiTLES|SUNLiGHT|SUPES|SVD|SWAGGERNAUT|SYNDiCATE|T00NG0D|TANTRiC|TBS|TDF|TDRS|TEAM|Tekno|Tenebrous|TFE|THeRe|THuG|TIKO|TimMm|TLF|TmG|ToK|TOPAZ|TRUEFRENCH|TSR|TWiZTED|TyL|uC|UKB5|UNRATED|UPiNSMOKE|UsaBit|URANiME|Vei|VeZ|ViP3R|VOLTAGE|WAWA|WAZ|WeLD|WiM|WOMBAT|WORKPRINT|WPi|WRD|WTF|XPLORE|XSHD|XTiNE|XViD|YAGO|YiFF|YOUNiVERSE|ZENTAROS|ZeaL|Zeus|ZMN|ZONE|ZoNE|ZZGtv|Rets|ARABiC|aXXo|BadTasteRecords|cOOt|DVDScr|FiH|GOM|LAP|LOMO|LUMiX|MbS|MEAPO|NEMOORTV|NoGroup|NwC|ORC|PTNK|REALiTY|SAMPLE|SYNDiCATE|TELESYNC|ToMpDaWg|TS|UnKnOwN|VECTORPDA|VH|ViSiON|Vomit|WRD|x264|XviD|BDRip|1080p|720p)\b/gi, '');
  name = name.replace(/\(\d{4}\)/g, '');
  name = name.replace(/\[.*?\]/g, '');
  name = name.replace(/[._-]/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();

  return name;
};

export const useSubtitleManager = ({ torrentHash, mediaTitle, videoRef, fileIndex = 0 }) => {
  const subtitleBlobUrlRef = useRef(null);
  const originalVttContentRef = useRef(null); // Store original VTT for offset adjustments

  const [availableSubtitles, setAvailableSubtitles] = useState([]);
  const [onlineSubtitles, setOnlineSubtitles] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState(null);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [isUploadingSubtitle, setIsUploadingSubtitle] = useState(false);
  const [subtitleUploadError, setSubtitleUploadError] = useState(null);
  const [subtitleDeletingId, setSubtitleDeletingId] = useState(null);
  const [subtitleDeleteError, setSubtitleDeleteError] = useState(null);
  const [autoLoadedSubtitle, setAutoLoadedSubtitle] = useState(false);
  const [subtitleOffset, setSubtitleOffset] = useState(0); // in milliseconds

  const fetchSubtitles = useCallback(async () => {
    if (!torrentHash) return;

    try {
      // Fetch both per-episode subtitles and legacy subtitles
      const [torrentResult, episodeSubtitlesResult, legacySubtitlesResult] = await Promise.allSettled([
        fetch(config.getTorrentUrl(torrentHash, 'files')),
        fetch(`${config.apiBaseUrl}/api/subtitles/${torrentHash}/${fileIndex}`),
        fetch(config.getSubtitleListUrl(torrentHash))
      ]);

      let torrentSubtitleFiles = [];
      if (torrentResult.status === 'fulfilled' && torrentResult.value.ok) {
        const filesPayload = await torrentResult.value.json();
        const files = Array.isArray(filesPayload) ? filesPayload : filesPayload.files || [];

        torrentSubtitleFiles = files
          .filter((file) => {
            const ext = file.name.toLowerCase().split('.').pop();
            return ['srt', 'vtt'].includes(ext);
          })
          .map((file) => ({
            id: `torrent-${file.index}`,
            index: file.index,
            name: file.name,
            language: extractLanguageFromFilename(file.name),
            label: extractLanguageFromFilename(file.name),
            url: config.getDownloadUrl(torrentHash, file.index),
            source: 'torrent',
            format: file.name.toLowerCase().endsWith('.srt') ? 'srt' : 'vtt'
          }));
      }

      // Per-episode uploaded subtitles (priority)
      let episodeSubtitles = [];
      if (episodeSubtitlesResult.status === 'fulfilled' && episodeSubtitlesResult.value.ok) {
        const episodePayload = await episodeSubtitlesResult.value.json();
        const subtitles = Array.isArray(episodePayload) ? episodePayload : episodePayload.subtitles || [];

        episodeSubtitles = subtitles.map((item) => ({
          id: `episode-${item.id || item.filename}`,
          index: `episode-${item.id || item.filename}`,
          name: item.filename,
          language: item.language || extractLanguageFromFilename(item.filename),
          label: item.label || item.language || item.filename,
          url: item.url?.startsWith('http')
            ? item.url
            : config.getApiUrl(item.url || `/api/subtitles/${torrentHash}/${fileIndex}/files/${encodeURIComponent(item.filename)}`),
          source: item.source || 'upload',
          format: item.format || 'vtt',
          fileIndex: fileIndex
        }));
      }

      // Legacy uploaded subtitles (fallback for movies/single files)
      let legacySubtitles = [];
      if (legacySubtitlesResult.status === 'fulfilled' && legacySubtitlesResult.value.ok) {
        const legacyPayload = await legacySubtitlesResult.value.json();
        const subtitles = Array.isArray(legacyPayload) ? legacyPayload : legacyPayload.subtitles || [];

        legacySubtitles = subtitles.map((item) => ({
          id: `local-${item.id || item.filename}`,
          index: `local-${item.id || item.filename}`,
          name: item.filename,
          language: item.language || extractLanguageFromFilename(item.filename),
          label: `${item.label || item.language || item.filename} (Legacy)`,
          url: item.url?.startsWith('http')
            ? item.url
            : config.getApiUrl(item.url || `/api/subtitles/${torrentHash}/files/${encodeURIComponent(item.filename)}`),
          source: item.source || 'upload',
          format: item.format || 'vtt'
        }));
      }

      // Priority: Episode subtitles > Torrent subtitles > Legacy subtitles
      setAvailableSubtitles([...episodeSubtitles, ...torrentSubtitleFiles, ...legacySubtitles]);
    } catch (error) {
      console.warn('SubtitleManager: Failed to fetch subtitles', error);
    }
  }, [torrentHash, fileIndex]);

  useEffect(() => {
    if (!torrentHash) return;
    fetchSubtitles();
  }, [torrentHash, fileIndex, fetchSubtitles]);

  // Auto-load previously used subtitle
  useEffect(() => {
    if (!torrentHash || fileIndex === null || autoLoadedSubtitle || availableSubtitles.length === 0) return;

    const autoLoadSubtitle = async () => {
      try {
        const lastSubtitle = progressService.getLastSubtitle(torrentHash, fileIndex);
        
        if (lastSubtitle && lastSubtitle.filename) {
          // Find matching subtitle in available subtitles
          const matchingSubtitle = availableSubtitles.find(
            (sub) => sub.name === lastSubtitle.filename || sub.url === lastSubtitle.url
          );

          if (matchingSubtitle) {
            console.log('🎯 Auto-loading previously used subtitle:', lastSubtitle.filename);
            await loadSubtitle(matchingSubtitle);
            setAutoLoadedSubtitle(true);
          } else {
            console.log('ℹ️ Previously used subtitle not found in available subtitles');
          }
        }
      } catch (error) {
        console.warn('SubtitleManager: Auto-load failed', error);
      }
    };

    // Delay auto-load slightly to ensure video is ready
    const timer = setTimeout(autoLoadSubtitle, 500);
    return () => clearTimeout(timer);
  }, [torrentHash, fileIndex, availableSubtitles, autoLoadedSubtitle, loadSubtitle]);

  useEffect(() => () => {
    if (subtitleBlobUrlRef.current) {
      URL.revokeObjectURL(subtitleBlobUrlRef.current);
      subtitleBlobUrlRef.current = null;
    }
  }, []);

  const localSubtitles = useMemo(
    () => availableSubtitles.filter((subtitle) => subtitle.source === 'upload'),
    [availableSubtitles]
  );

  const torrentSubtitles = useMemo(
    () => availableSubtitles.filter((subtitle) => subtitle.source !== 'upload'),
    [availableSubtitles]
  );

  const loadSubtitle = useCallback(
    async (subtitleFile) => {
      if (!videoRef?.current) return;

      try {
        const video = videoRef.current;
        if (subtitleBlobUrlRef.current) {
          URL.revokeObjectURL(subtitleBlobUrlRef.current);
          subtitleBlobUrlRef.current = null;
        }

        const existingTracks = video.querySelectorAll('track');
        existingTracks.forEach((track) => track.remove());

        if (!subtitleFile) {
          setCurrentSubtitle(null);
          setSubtitlesEnabled(false);
          setShowSubtitleMenu(false);
          return;
        }

        let subtitleUrl = subtitleFile.url;
        let vttContent = null;
        const isSrtFormat =
          subtitleFile.format === 'srt' || subtitleFile.name?.toLowerCase().endsWith('.srt');

        // Fetch and convert subtitle content
        try {
          const response = await fetch(subtitleFile.url);
          if (response.ok) {
            const textContent = await response.text();
            vttContent = isSrtFormat ? convertSrtTextToVtt(textContent) : textContent;
            
            // Store original VTT for offset adjustments
            originalVttContentRef.current = vttContent;
            
            // Apply current offset (if any) or restore from saved progress
            let currentOffset = subtitleOffset;
            
            // Try to restore saved offset from progress
            if (torrentHash && fileIndex !== null) {
              try {
                const lastSubtitle = progressService.getLastSubtitle(torrentHash, fileIndex);
                if (lastSubtitle && lastSubtitle.filename === subtitleFile.name && lastSubtitle.offset !== undefined) {
                  currentOffset = lastSubtitle.offset;
                  setSubtitleOffset(currentOffset);
                  console.log('🔄 Restored subtitle offset:', currentOffset, 'ms');
                }
              } catch (progressError) {
                console.warn('SubtitleManager: Failed to restore offset from progress', progressError);
              }
            }
            
            // Apply offset to VTT
            const adjustedVtt = applyOffsetToVtt(vttContent, currentOffset);
            const blob = new Blob([adjustedVtt], { type: 'text/vtt' });
            subtitleUrl = URL.createObjectURL(blob);
            subtitleBlobUrlRef.current = subtitleUrl;
          }
        } catch (conversionError) {
          console.error('SubtitleManager: Subtitle conversion failed', conversionError);
          return;
        }

        const track = document.createElement('track');
        track.kind = 'subtitles';
        const trackLabel = subtitleFile.label || subtitleFile.language || subtitleFile.name || 'Subtitle';
        track.label = trackLabel;
        track.srclang = (subtitleFile.language || 'en').toLowerCase().substring(0, 2);
        track.src = subtitleUrl;
        track.default = true;

        video.appendChild(track);

        track.addEventListener('load', () => {
          if (video.textTracks.length > 0) {
            video.textTracks[0].mode = 'showing';
          }
        });

        setCurrentSubtitle(subtitleFile);
        setSubtitlesEnabled(true);
        setShowSubtitleMenu(false);

        // Save subtitle selection to progress (if progressService is available)
        if (torrentHash && fileIndex !== null && typeof window !== 'undefined') {
          try {
            progressService.updateSubtitle(torrentHash, fileIndex, {
              filename: subtitleFile.name,
              url: subtitleFile.url,
              language: subtitleFile.language,
              format: subtitleFile.format,
              offset: subtitleOffset // Save current offset
            });
            console.log('💾 Subtitle selection saved to progress');
          } catch (progressError) {
            console.warn('SubtitleManager: Failed to save subtitle to progress', progressError);
          }
        }
      } catch (error) {
        console.error('SubtitleManager: Error loading subtitle', error);
      }
    },
    [videoRef, torrentHash, fileIndex, subtitleOffset]
  );

  const uploadSubtitle = useCallback(
    async (file) => {
      if (!file || !torrentHash) return;

      setSubtitleUploadError(null);
      setIsUploadingSubtitle(true);

      try {
        const formData = new FormData();
        formData.append('subtitle', file);

        // Use per-episode upload endpoint if fileIndex is provided
        const uploadUrl = fileIndex !== null && fileIndex !== undefined
          ? `${config.apiBaseUrl}/api/subtitles/${torrentHash}/${fileIndex}/upload`
          : config.getSubtitleUploadUrl(torrentHash);

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload.error || `Upload failed with status ${response.status}`);
        }

        const uploadedSubtitle = await response.json();
        console.log('✅ Subtitle uploaded successfully:', uploadedSubtitle.filename);

        await fetchSubtitles();

        // Auto-load the newly uploaded subtitle
        if (uploadedSubtitle && uploadedSubtitle.url) {
          await loadSubtitle(uploadedSubtitle);
        }
      } catch (error) {
        console.error('SubtitleManager: Subtitle upload failed', error);
        setSubtitleUploadError(error.message || 'Failed to upload subtitle');
      } finally {
        setIsUploadingSubtitle(false);
      }
    },
    [torrentHash, fileIndex, fetchSubtitles, loadSubtitle]
  );

  const deleteSubtitle = useCallback(
    async (subtitle) => {
      if (!torrentHash || !subtitle?.name) {
        setSubtitleDeleteError('Deletion is only available for active torrents.');
        return;
      }

      setSubtitleDeleteError(null);
      setSubtitleDeletingId(subtitle.id);

      try {
        const response = await fetch(config.getSubtitleDeleteUrl(torrentHash, subtitle.name), {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload.error || `Deletion failed (status ${response.status}).`);
        }

        if (subtitleBlobUrlRef.current) {
          URL.revokeObjectURL(subtitleBlobUrlRef.current);
          subtitleBlobUrlRef.current = null;
        }

        if (currentSubtitle?.id === subtitle.id && videoRef?.current) {
          const tracks = videoRef.current.querySelectorAll('track');
          tracks.forEach((track) => track.remove());
          setCurrentSubtitle(null);
          setSubtitlesEnabled(false);
        }

        setAvailableSubtitles((prev) => prev.filter((item) => item.id !== subtitle.id));
        await fetchSubtitles();
      } catch (error) {
        console.error('SubtitleManager: Subtitle deletion failed', error);
  setSubtitleDeleteError(error.message || 'Subtitle deletion failed.');
      } finally {
        setSubtitleDeletingId(null);
      }
    },
    [torrentHash, currentSubtitle, fetchSubtitles, videoRef]
  );

  const searchOnlineSubtitles = useCallback(async () => {
    if (!mediaTitle) return;

    setIsSearchingOnline(true);

    try {
      const cleanName = extractMediaName(mediaTitle);
      const response = await fetch(config.getApiUrl('/api/subtitles/search'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: cleanName,
          filename: mediaTitle
        })
      });

      if (!response.ok) {
        throw new Error(`Subtitle search failed (${response.status})`);
      }

      const results = await response.json();
      setOnlineSubtitles(results || []);
    } catch (error) {
      console.error('SubtitleManager: Subtitle search failed', error);
      setOnlineSubtitles([]);
    } finally {
      setIsSearchingOnline(false);
    }
  }, [mediaTitle]);

  const loadOnlineSubtitle = useCallback(
    async (subtitle) => {
      if (!subtitle || !videoRef?.current) return;

      try {
        const downloadUrl = config.getSubtitleDownloadUrl(subtitle.url);
        const response = await fetch(downloadUrl);

        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`);
        }

        const subtitleContent = await response.text();
        const blob = new Blob([subtitleContent], { type: 'text/vtt' });
        const subtitleUrl = URL.createObjectURL(blob);

        if (subtitleBlobUrlRef.current) {
          URL.revokeObjectURL(subtitleBlobUrlRef.current);
        }
        subtitleBlobUrlRef.current = subtitleUrl;

        const video = videoRef.current;
        const existingTracks = video.querySelectorAll('track');
        existingTracks.forEach((track) => track.remove());

        const track = document.createElement('track');
        track.kind = 'subtitles';
        const trackLanguage = subtitle.language || 'Unknown';
        track.label = `${trackLanguage}${subtitle.source ? ` (${subtitle.source})` : ''}`;
        track.srclang = trackLanguage.toLowerCase().substring(0, 2);
        track.src = subtitleUrl;
        track.default = true;

        video.appendChild(track);
        track.addEventListener('load', () => {
          if (video.textTracks.length > 0) {
            video.textTracks[0].mode = 'showing';
          }
        });

        setCurrentSubtitle({
          ...subtitle,
          id: `online-${subtitle.id || subtitle.url}`,
          index: `online-${subtitle.id || subtitle.url}`,
          url: subtitleUrl,
          source: 'online'
        });
        setSubtitlesEnabled(true);
        setShowSubtitleMenu(false);
      } catch (error) {
        console.error('SubtitleManager: Error loading online subtitle', error);
      }
    },
    [videoRef]
  );

  const toggleSubtitles = useCallback(() => {
    if (!videoRef?.current || !videoRef.current.textTracks.length) {
      return;
    }

    const newEnabled = !subtitlesEnabled;
    videoRef.current.textTracks[0].mode = newEnabled ? 'showing' : 'hidden';
    setSubtitlesEnabled(newEnabled);
  }, [subtitlesEnabled, videoRef]);

  // Adjust subtitle offset by delta milliseconds
  const adjustSubtitleOffset = useCallback(async (deltaMs) => {
    if (!currentSubtitle || !originalVttContentRef.current || !videoRef?.current) {
      console.warn('SubtitleManager: Cannot adjust offset - no subtitle loaded');
      return;
    }

    const newOffset = subtitleOffset + deltaMs;
    setSubtitleOffset(newOffset);

    // Reapply subtitle with new offset
    try {
      const video = videoRef.current;
      
      // Apply offset to original VTT
      const adjustedVtt = applyOffsetToVtt(originalVttContentRef.current, newOffset);
      
      // Create new blob URL
      if (subtitleBlobUrlRef.current) {
        URL.revokeObjectURL(subtitleBlobUrlRef.current);
      }
      
      const blob = new Blob([adjustedVtt], { type: 'text/vtt' });
      const newUrl = URL.createObjectURL(blob);
      subtitleBlobUrlRef.current = newUrl;

      // Remove old track
      const existingTracks = video.querySelectorAll('track');
      existingTracks.forEach((track) => track.remove());

      // Create new track with adjusted subtitle
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = currentSubtitle.label || currentSubtitle.language || currentSubtitle.name || 'Subtitle';
      track.srclang = (currentSubtitle.language || 'en').toLowerCase().substring(0, 2);
      track.src = newUrl;
      track.default = true;

      video.appendChild(track);

      track.addEventListener('load', () => {
        if (video.textTracks.length > 0) {
          video.textTracks[0].mode = subtitlesEnabled ? 'showing' : 'hidden';
        }
      });

      // Save new offset to progress
      if (torrentHash && fileIndex !== null) {
        try {
          progressService.updateSubtitle(torrentHash, fileIndex, {
            filename: currentSubtitle.name,
            url: currentSubtitle.url,
            language: currentSubtitle.language,
            format: currentSubtitle.format,
            offset: newOffset
          });
          console.log('💾 Subtitle offset saved:', newOffset, 'ms');
        } catch (progressError) {
          console.warn('SubtitleManager: Failed to save offset to progress', progressError);
        }
      }

      console.log('🔄 Subtitle offset adjusted:', newOffset, 'ms');
    } catch (error) {
      console.error('SubtitleManager: Failed to adjust offset', error);
    }
  }, [currentSubtitle, subtitleOffset, subtitlesEnabled, videoRef, torrentHash, fileIndex]);

  return {
    state: {
      availableSubtitles,
      onlineSubtitles,
      currentSubtitle,
      showSubtitleMenu,
      subtitlesEnabled,
      isSearchingOnline,
      isUploadingSubtitle,
      subtitleUploadError,
      subtitleDeletingId,
      subtitleDeleteError,
      localSubtitles,
      torrentSubtitles,
      subtitleOffset
    },
    actions: {
      setShowSubtitleMenu,
      loadSubtitle,
      uploadSubtitle,
      deleteSubtitle,
      searchOnlineSubtitles,
      loadOnlineSubtitle,
      toggleSubtitles,
      fetchSubtitles,
      setSubtitleUploadError,
      adjustSubtitleOffset
    }
  };
};
