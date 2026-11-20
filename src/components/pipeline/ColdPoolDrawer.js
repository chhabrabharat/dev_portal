import React, { useCallback, useEffect, useState } from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import CloseIcon from '@mui/icons-material/Close';
import { COLORS, SHADOWS } from '../../styles/js/styleConstants';
import { PIPELINE_CATEGORIES } from '../../styles/js/adminTokens';
import { addColdLeadToPipeline, errorMessage, fetchColdPool } from '../../services/api';
import ColdImportPanel from './ColdImportPanel';

const PAGE = 40;

/**
 * The Google-sourced pool: clinics nobody has started working. The list is fetched when the
 * drawer opens and after every add, not polled - a cold lead only ever leaves the pool through
 * this drawer or the import, so there is nothing for a second operator's edit to change here
 * that the add itself would not reveal (the server refuses a second add).
 */
export default function ColdPoolDrawer({ open, onClose, canWrite, onAdded }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(PAGE);
  const [addingId, setAddingId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchColdPool({ search, category }));
      setLimit(PAGE);
      setLoaded(true);
    } catch (e) {
      setError(errorMessage(e, 'Could not load the cold pool'));
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [open, load]);

  const add = async (row) => {
    setAddingId(row.id);
    setError(null);
    try {
      const lead = await addColdLeadToPipeline(row.id);
      setRows((rs) => rs.filter((r) => r.id !== row.id));
      onAdded(lead);
    } catch (e) {
      setError(errorMessage(e, 'Could not add this lead'));
      // Another operator may have taken it since the list loaded; refresh rather than leave a
      // row that will fail again.
      load();
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 400 } } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, pt: 2, pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.textPrimary, flexGrow: 1 }}>
          Cold pool{loaded ? ` · ${rows.length.toLocaleString('en-IN')}` : ''}
        </Typography>
        <IconButton onClick={onClose} aria-label="Close cold pool">
          <CloseIcon />
        </IconButton>
      </Box>
      <Typography variant="caption" sx={{ color: COLORS.textMuted, px: 2, pb: 1 }}>
        From Google, most-reviewed first. Adding one creates a lead in New and removes it here.
      </Typography>
      <Box sx={{ px: 2, pb: 1 }}>
        <Button size="small" disabled={!canWrite} onClick={() => setImportOpen((o) => !o)}>
          {importOpen ? 'Hide import' : 'Import CSV'}
        </Button>
      </Box>
      {importOpen && <ColdImportPanel disabled={!canWrite} onImported={load} />}
      <Box sx={{ display: 'flex', gap: 1, px: 2, pb: 1 }}>
        <TextField size="small" label="Search" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }} />
        <TextField select size="small" label="Category" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 120 }}>
          <MenuItem value="">All</MenuItem>
          {Object.entries(PIPELINE_CATEGORIES).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v}</MenuItem>
          ))}
        </TextField>
      </Box>
      {loading && <LinearProgress />}
      {error && <Alert severity="error" sx={{ mx: 2, mb: 1 }}>{error}</Alert>}
      <Box sx={{ overflowY: 'auto', px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {rows.slice(0, limit).map((row) => (
          <Box key={row.id} sx={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: 2, p: 1.25, boxShadow: SHADOWS.sm }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: COLORS.textPrimary, overflowWrap: 'anywhere' }}>
              {row.name}
            </Typography>
            <Typography variant="caption" sx={{ color: COLORS.textMuted, display: 'block' }}>
              {[
                row.type || (row.category && PIPELINE_CATEGORIES[row.category]),
                row.rating != null ? `★ ${row.rating} (${row.reviewCount ?? 0})` : null,
                row.distanceKm != null ? `${row.distanceKm} km` : null,
              ].filter(Boolean).join(' · ')}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.75, gap: 1 }}>
              <Typography variant="caption" sx={{ color: COLORS.textMuted }}>{row.phone || 'No phone'}</Typography>
              <Button size="small" variant="outlined" disabled={!canWrite || addingId === row.id} onClick={() => add(row)}>
                {addingId === row.id ? 'Adding…' : 'Add to pipeline'}
              </Button>
            </Box>
          </Box>
        ))}
        {rows.length > limit && (
          <Button size="small" onClick={() => setLimit((l) => l + PAGE)}>
            Show more ({rows.length - limit})
          </Button>
        )}
        {loaded && !loading && rows.length === 0 && (
          <Typography variant="body2" sx={{ color: COLORS.textMuted, textAlign: 'center', py: 3 }}>
            {search || category ? 'No matching cold leads.' : 'The cold pool is empty.'}
          </Typography>
        )}
      </Box>
    </Drawer>
  );
}
