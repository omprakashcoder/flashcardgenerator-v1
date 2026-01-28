import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MindMapData } from '../types';
import { ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

interface MindMapProps {
  data: MindMapData;
  title: string;
}

export const MindMap: React.FC<MindMapProps> = ({ data, title }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Clear previous render
    d3.select(svgRef.current).selectAll("*").remove();

    // Create colors based on groups
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Deep copy data to avoid mutation issues in React strict mode
    const links = data.links.map(d => ({...d}));
    const nodes = data.nodes.map(d => ({...d}));

    // Simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(40));

    const svg = d3.select(svgRef.current)
        .attr("viewBox", [0, 0, width, height])
        .style("background-color", "#1e1e2e"); // Obsidian-like dark background

    // Add arrow markers
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .enter().append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#999");

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
            setZoomLevel(event.transform.k);
        });

    svg.call(zoom as any);

    const link = g.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value || 1))
      .attr("marker-end", "url(#arrow)");

    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended) as any);

    // Node circles
    node.append("circle")
      .attr("r", (d: any) => d.group === 1 ? 20 : (d.group === 2 ? 15 : 8))
      .attr("fill", (d: any) => color(String(d.group)))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "grab");

    // Node labels
    node.append("text")
      .text((d: any) => d.label)
      .attr("x", 12)
      .attr("y", 4)
      .style("font-family", "Inter, sans-serif")
      .style("font-size", (d: any) => d.group === 1 ? "14px" : "10px")
      .style("font-weight", (d: any) => d.group === 1 ? "bold" : "normal")
      .style("fill", "#e0e0e0")
      .style("pointer-events", "none")
      .style("text-shadow", "1px 1px 2px #000");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

  }, [data]);

  return (
    <div className="relative w-full h-full bg-[#1e1e2e] rounded-xl overflow-hidden shadow-2xl border border-slate-700" ref={containerRef}>
      <div className="absolute top-4 left-4 z-10 text-white bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">
         <span className="font-bold text-sm tracking-wider">{title}</span>
      </div>
      
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
         <button className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors shadow-lg" title="Zoom In">
            <ZoomIn size={20} />
         </button>
         <button className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors shadow-lg" title="Zoom Out">
            <ZoomOut size={20} />
         </button>
      </div>

      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
};
