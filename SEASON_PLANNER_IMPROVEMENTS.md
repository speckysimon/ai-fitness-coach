# Season Planner UX Improvements - Implementation Summary

## Status: In Progress (3/8 Complete)

### ✅ Completed

#### 1. Clickable Filter Tiles (DONE)
- All 5 summary tiles now clickable
- Active filter shown with ring border + "Active" label
- Filter state: Total (all) → Confirmed → Provisional → Peak (A) → Important (B)
- Click same tile to clear filter
- `filteredRaces` computed via useMemo for performance

#### 2. Monthly Racing Load Enhancements (DONE)
- **Priority badges**: A/B badges shown in each month card
- **Explanatory text**: 
  - "Driven by A race" (1 A race)
  - "2 A races" (multiple A)
  - "1 B race" / "X B races"
  - "Low race density" (C races only)
- **Warning icons**: AlertCircle shown when:
  - Two Heavy months are adjacent
  - Very Heavy month contains no A race

#### 3. Filter Active State (DONE)
- Ring border (2px) in matching color
- "Active" text label below count
- Hover shadow on all tiles
- Smooth transitions

### 🚧 In Progress

#### 4. Monthly Racing Costs Updates
**Need to implement:**
- Replace "N/A" with "€0"
- Add priority context: "€30 (A race)", "€25 (B race)"
- Season-level note: "Costs concentrated in A races" / "Spread evenly"

#### 5. List View - Race Cards
**Need to implement:**
- Increase visual hierarchy: Race name + priority dominant
- TSS immediately adjacent to priority
- Metadata (fee, website, elevation) visually quieter
- Make cards clickable to open edit modal
- Highlight corresponding month in load panel on click

#### 6. Calendar View Simplification
**Need to implement:**
- Show: Race name, priority badge, TSS only
- Hide elevation/distance unless hover
- Slight background emphasis for A races affecting surrounding days

#### 7. Season Sanity Check Box
**High-value addition - implement as new component:**
```jsx
<Card>
  <CardHeader>
    <CardTitle>Season Sanity Check</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      {peakRacesSpacedWell && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span>Peak races spaced well</span>
        </div>
      )}
      {heavyLoadWarning && (
        <div className="flex items-center gap-2 text-orange-600">
          <AlertCircle className="w-4 h-4" />
          <span>Heavy load in May–June</span>
        </div>
      )}
      {recoveryPeriod && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span>July allows recovery</span>
        </div>
      )}
    </div>
  </CardContent>
</Card>
```

**Logic needed:**
- Check A race spacing (min 4 weeks recommended)
- Identify consecutive heavy months
- Identify recovery periods (light months after heavy)

#### 8. Global Clarity Improvements
**Need to implement:**
- Consistent naming: "Monthly Racing Load (TSS)" once
- Add "Estimated" hint near TSS values
- Ensure all tooltips answer one question
- Convert static tooltips to click-through previews

## Technical Notes

### State Added
```javascript
const [activeFilter, setActiveFilter] = useState(null);
```

### Computed Values
```javascript
const filteredRaces = useMemo(() => {
  if (!activeFilter) return races;
  if (activeFilter === 'confirmed' || activeFilter === 'provisional') {
    return races.filter(r => r.status === activeFilter);
  }
  if (activeFilter === 'A' || activeFilter === 'B') {
    return races.filter(r => r.priority === activeFilter);
  }
  return races;
}, [races, activeFilter]);
```

### Monthly Load Enhancements
- Priority counting: `aRaces`, `bRaces` arrays
- Warning detection: `adjacentHeavyWarning`, `veryHeavyNoA`
- Explanation generation based on priority distribution

## Next Steps

1. **Complete Monthly Costs** - Add priority context and €0 instead of N/A
2. **Implement Season Sanity Check** - New component with intelligent warnings
3. **Update List View** - Improve visual hierarchy and clickability
4. **Simplify Calendar View** - Show/hide on hover
5. **Global polish** - Consistent naming, tooltips, hints

## Files Modified
- `/Users/simonosx/CascadeProjects/ai-fitness-coach/src/pages/SeasonPlanner.jsx`

## Estimated Remaining Work
- 2-3 hours for remaining 5 improvements
- Most complex: Season Sanity Check logic
- Simplest: Monthly Costs text updates
