import { useContext } from 'react';
import SyncContext from '../contexts/SyncContextStore';

export const useSyncStatusContext = () => useContext(SyncContext);

export default useSyncStatusContext;
