# Activity API Analysis For Pulsi

This document explains what the Garmin Activity API offers and which parts are likely useful for Pulsi as a coach-facing readiness and training-guidance product.

Primary source:

- `docs/Activity_API-1.2.4.pdf`

## 1. What The Activity API Is

The Activity API is not the same as the Health API.

Health API is mostly all-day wellness and recovery context:

- sleep
- HRV
- dailies
- stress
- pulse ox
- respiration

Activity API is discrete workout/session data:

- runs
- rides
- swims
- gym sessions
- team sport activities
- manually entered activities
- activity details and files

For Pulsi, the Activity API is useful when we want to understand:

- what deliberate training the athlete actually did
- how hard that session was
- whether the athlete performed extra conditioning outside the club plan
- whether rehab or return-to-running work happened as prescribed

## 2. Summary Types And Their Value

### Activity Summaries

What it contains:

- activity type
- activity name
- start time
- duration
- distance
- active kilocalories
- average/max speed
- average/max heart rate
- cadence
- elevation gain/loss
- device name
- manual / web-upload flags

Value to Pulsi:

- high

Why:

- very good signal for deliberate training sessions
- low implementation complexity compared with Activity Details
- enough to power session counts, basic load views, conditioning history, and adherence checks

Best coach use cases:

- identify extra sessions outside club programming
- quantify conditioning or cardio sessions during rehab
- separate deliberate training from passive all-day movement
- show recent activity type mix such as run, cycling, gym, swim

### Manually Updated Activities

What it contains:

- similar structure to activity summaries
- explicitly marked as manually updated

Value to Pulsi:

- medium to low

Why:

- useful as athlete-entered context
- lower trust than device-recorded activity

Best coach use cases:

- self-reported cross-training
- rehab work logged manually
- travel-day context when device data is missing

Important rule:

- manual activities should always be visually flagged and never treated as equal-confidence to device-recorded activity

### Activity Details

What it contains:

- summary-level activity data
- sample stream
- GPS coordinates
- heart rate
- speed
- power
- cadence
- distance progression
- timer/clock/moving duration
- laps

Value to Pulsi:

- very high

Why:

- this is the highest-leverage Activity API dataset for coach-facing training insights
- it enables session intensity analysis instead of only session existence

Best coach use cases:

- derive internal session load proxies
- inspect interval structure
- detect stop/start, pause-heavy, or incomplete sessions
- assess return-to-running progression
- compare planned vs actual conditioning structure
- identify whether a session was steady aerobic, interval-based, or sprint-heavy

Important limitation:

- historical data for Activity Details is only available with Push Service
- activities over 24 hours are not available through Activity Details

### Activity Files

What it contains:

- raw FIT, TCX, or GPX files
- Garmin-original file data
- product-specific details not necessarily exposed in parsed summaries

Value to Pulsi:

- high potential, high complexity

Why:

- this is the richest technical source
- but it requires external FIT/TCX/GPX parsing and much more processing

Best coach use cases:

- advanced GPS track analysis
- future workload and interval feature extraction
- specialized sport-specific parsing

Recommendation:

- do not start here
- only add Activity Files after Activity Summaries and Activity Details are working

### Move IQ

What it contains:

- automatically detected movement labels
- activity type and subtype
- start time
- duration

Value to Pulsi:

- low to medium

Why:

- useful as passive behavioral context
- not a deliberate training record
- some signal for rehab compliance or general activity, but lower coach confidence

Best coach use cases:

- low-intensity movement trend
- passive activity awareness on recovery days
- rough context for inactive or off-feet days

## 3. What Activity API Adds Beyond Health API

Health API tells Pulsi how recovered the athlete appears.

Activity API tells Pulsi what the athlete actually did.

That combination is powerful:

- high readiness + no recent activity could mean green for full training
- low readiness + extra unplanned conditioning yesterday could explain caution status
- good HRV trend + repeated high-load activity blocks could support progressive return-to-play
- poor sleep + long running session + elevated activity HR could justify coach attention

In short:

- Health API = readiness context
- Activity API = training exposure context

## 4. Best Product Opportunities For Coaches

### 1. Extra Training Detection

Use Activity Summaries to detect sessions outside the club plan.

Why it matters:

- coaches care about hidden load
- extra runs, rides, or gym work can explain poor readiness the next day

### 2. Rehab And Return-To-Play Monitoring

Use Activity Summaries and Activity Details to track:

- running duration
- session frequency
- intensity progression
- interval structure

Why it matters:

- staff can see whether the athlete is rebuilding as expected

### 3. Conditioning Context For Readiness

Use recent activity data to contextualize readiness recommendations.

Examples:

- low readiness plus hard session yesterday
- caution status after several days of accumulating extra work
- restricted band after sleep drop plus high-intensity conditioning

### 4. Session Classification

Use Activity Details to group sessions into:

- aerobic
- interval
- sprint-heavy
- cross-training
- recovery

Why it matters:

- coaches can make better load decisions than with step counts alone

### 5. Weekly Exposure Views

Use Activity Summaries to show:

- number of sessions
- total duration
- total distance
- by activity type

This is especially useful for:

- off-season
- individual conditioning blocks
- remote players

## 5. What Is Less Useful For Pulsi

The following are lower priority for a football-club readiness product:

- raw Activity Files as the first implementation step
- Move IQ as a major signal
- manually updated activities as high-trust load data

These are still useful, but they should not lead the roadmap.

## 6. Product Risks And Guardrails

### Double Counting

Activity metrics such as steps and distance often overlap with Health API daily and epoch data.

Pulsi should not double count:

- all-day wellness movement
- deliberate activity movement

Health and Activity should be treated as different layers of meaning, not simply summed.

### Trust Levels

Not all activity data should be treated equally:

- device-recorded activity: high trust
- manually updated activity: lower trust
- Move IQ: contextual only

### Coaching, Not Medical Interpretation

Pulsi should use Activity API to inform:

- training recommendations
- recovery context
- compliance and adherence

Pulsi should not present:

- injury diagnosis
- medical conclusions

## 7. Recommended Implementation Order

### Phase 1

- Activity Summaries
- basic storage
- coach timeline of deliberate sessions
- recent session context next to readiness

### Phase 2

- Activity Details
- sample and lap persistence
- session load and interval analysis
- return-to-play progression features

### Phase 3

- Manually Updated Activities
- clearly flagged as lower-confidence context

### Phase 4

- Move IQ
- optional passive-behavior context

### Phase 5

- Activity Files
- only if we need deeper Garmin-native data than Activity Details exposes

## 8. Recommended Engineering Shape

If Pulsi adds Activity API, it should follow the same pattern as Health API:

- typed contracts for every Garmin summary family
- push and ping endpoint support
- callback processing for ping
- provider-specific mapping layer
- internal summary storage table
- separate coach-facing derivation logic

Important design rule:

- store raw activity summaries broadly
- derive coach-facing features selectively

That keeps the integration future-proof without forcing product decisions too early.

## 9. Final Recommendation

For Pulsi, the best Activity API investment is:

1. Activity Summaries first
2. Activity Details second
3. everything else later

That gives the coaching staff the most practical value fastest:

- what training happened
- how hard it was
- whether it explains readiness today

## 10. Current Implementation Status

Pulsi now implements Garmin Activity Summaries end to end:

- typed Garmin Activity Summary payload contracts
- push ingestion
- ping ingestion with callback fetching
- structured summary storage in `provider_activity_summaries`
- tenant-safe coach API at `GET /v1/tenants/:tenantSlug/athletes/:athleteId/activities`

Still pending:

- Activity Details
- Manually Updated Activities as a distinct lower-trust path
- Move IQ
- Activity Files
