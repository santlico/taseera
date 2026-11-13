type IconName='electronics'|'all'|'grocery'|'pharmacy'|'beauty'|'location'|'compare'|'settings';
const files:Record<IconName,string>={electronics:'laptop',all:'layout-grid',grocery:'shopping-basket',pharmacy:'pill',beauty:'spray-can',location:'map-pin',compare:'arrow-left-right',settings:'sliders-horizontal'};
/** Lucide interface glyphs, supplied by taste-skill; local SVG masks inherit UI colour. */
export function UiIcon({name}:{name:IconName}){
 return <span className="ui-icon" aria-hidden="true" style={{maskImage:`url(/icons/ui-${files[name]}.svg)`,WebkitMaskImage:`url(/icons/ui-${files[name]}.svg)`}}/>;
}
