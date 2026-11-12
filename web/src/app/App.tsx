import { Route, Routes } from "react-router-dom";
import { CutScreen } from "../screens/CutScreen";
import { JobDone } from "../screens/JobDone";
import { Landing } from "../screens/Landing";
import { MountScreen } from "../screens/MountScreen";
import { NotFound } from "../screens/NotFound";
import { RailDone } from "../screens/RailDone";
import { RailPicker } from "../screens/RailPicker";
import { RailScreen } from "../screens/RailScreen";
import { CabinetLayout } from "./CabinetLayout";

/** Every step of the job has its own address, so a reload or a second tablet lands on the same step. */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/cabinets/:cid" element={<CabinetLayout />}>
        <Route index element={<NotFound />} />
        <Route path="cut" element={<CutScreen />} />
        <Route path="rails" element={<RailPicker />} />
        <Route path="rails/:rid/mount" element={<RailScreen>{(rail) => <MountScreen key={rail.id} rail={rail} />}</RailScreen>} />
        <Route path="rails/:rid/done" element={<RailScreen>{(rail) => <RailDone key={rail.id} rail={rail} />}</RailScreen>} />
        <Route path="done" element={<JobDone />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<NotFound standalone />} />
    </Routes>
  );
}
