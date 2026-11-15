import type { ReactNode } from 'react';

import { MissionControl } from './components/mission/MissionControl';
import { SeasonLoader } from './components/mission/SeasonLoader';
import type { MissionBackend } from './mission/backend';
import { fabricBackend } from './mission/fabric-backend';
import { currentSeasonYear, useSeason } from './mission/hooks';

function App({
  backend = fabricBackend,
  crew,
}: {
  backend?: MissionBackend;
  /** A sign-in control for the crew, shown only on the public, signed-out app. */
  crew?: ReactNode;
}) {
  const year = currentSeasonYear();
  const { view, seed, reload, refresh, loadIntoFabric } = useSeason(backend, year);

  if (view.status === 'ready') {
    return (
      <MissionControl data={view.data} backend={backend} crew={crew} onHomeChange={() => void refresh()} />
    );
  }
  return (
    <SeasonLoader
      year={year}
      view={view}
      seed={seed}
      visitor={backend.visitor}
      crew={crew}
      onLoad={() => void loadIntoFabric(view.status === 'outdated')}
      onRetry={() => void reload()}
    />
  );
}

export default App;
