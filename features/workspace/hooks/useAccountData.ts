import { useState } from 'react';
import { buildAccountExport, saveAccountExport } from '../../../lib/account';
import type { FeedbackState } from './useFeedback';
import type { AuthState } from './useAuth';

type AccountDataDeps = Pick<FeedbackState, 'setError' | 'showToast'> & Pick<AuthState, 'session'>;

export function useAccountData({ setError, showToast, session }: AccountDataDeps) {
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  async function exportMyData() {
    if (!session || exportingData) return;
    setExportingData(true);
    try {
      await saveAccountExport(await buildAccountExport(session.user.id));
      showToast('Your data export is ready.');
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Could not export your data.');
    } finally {
      setExportingData(false);
    }
  }

  return {
    deleteAccountVisible,
    setDeleteAccountVisible,
    exportingData,
    exportMyData,
  };
}

export type AccountDataState = ReturnType<typeof useAccountData>;
