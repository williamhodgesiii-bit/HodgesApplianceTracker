-- Reset sample data for Appliance Tracker.
-- Paste into the Neon SQL editor and Run when you're done testing and want
-- to start entering real data.
--
-- This deletes ALL appliance rows. Labs and your login user are kept.

DELETE FROM appliances;

-- Optional: also remove the starter labs (uncomment if you want a clean slate).
-- Note: this will fail if any appliance still references a lab, so run the
-- DELETE above first.
-- DELETE FROM labs;
