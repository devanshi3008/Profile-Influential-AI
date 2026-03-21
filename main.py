import argparse
from rich.console import Console
from rich.table import Table

from crew import LinkedInBoosterCrew
from db.database import DatabaseManager, PublishLogModel

console = Console()

def run_content_cycle():
    console.print("[bold green]Starting manual content cycle...[/bold green]")
    crew = LinkedInBoosterCrew(rerun=True)  # Force rerun on manual triggering
    drafts = crew.run_content_cycle()
    
    console.print("\n[bold green]Cycle Complete![/bold green]")
    
    table = Table(title="Generated Post Drafts")
    table.add_column("Format type", style="cyan")
    table.add_column("Hook Preview", style="magenta")
    table.add_column("Read Time (s)", justify="right", style="green")
    
    for d in drafts:
        table.add_row(d.format_type, d.hook[:50] + "...", str(d.estimated_read_time))
        
    console.print(table)

def run_analysis_cycle():
    console.print("[bold blue]Checking for posts due for analysis...[/bold blue]")
    db = DatabaseManager()
    posts_due = db.get_posts_due_for_analysis()
    
    if not posts_due:
        console.print("[yellow]No posts are exactly >48h old without an analysis report.[/yellow]")
        return
        
    post_ids = [str(p.linkedin_post_id) for p in posts_due if p.linkedin_post_id]
    if not post_ids:
        console.print("[yellow]Found posts, but they missing LinkedIn IDs.[/yellow]")
        return
        
    console.print(f"[bold blue]Running analysis on {len(post_ids)} posts...[/bold blue]")
    crew = LinkedInBoosterCrew()
    reports = crew.run_analysis_cycle(post_ids)
    
    console.print(f"\n[bold green]Analysis Complete! Generated {len(reports)} reports.[/bold green]")
    
    for r in reports:
        console.print(f"- Post [cyan]{r.linkedin_post_id}[/cyan]: Tier [bold]{r.performance_tier}[/bold], Engagement: {r.engagement_rate:.2f}%")

def print_status():
    db = DatabaseManager()
    console.print("[bold]System Status[/bold]")
    
    latest_niche = db.get_latest_niche_profile()
    if latest_niche:
        console.print(f"Current Niche: [cyan]{latest_niche.primary_niche}[/cyan] (Confidence: {latest_niche.confidence_score})")
    else:
        console.print("Current Niche: [red]Not determined yet.[/red]")
        
    logs = db.db.query(PublishLogModel).order_by(PublishLogModel.scheduled_at.desc()).limit(10).all()
    if not logs:
        console.print("[yellow]No publish logs found.[/yellow]")
        return
        
    table = Table(title="Recent Scheduled/Published Posts")
    table.add_column("Status", style="cyan")
    table.add_column("Scheduled At", style="magenta")
    table.add_column("LinkedIn Post ID", style="green")
    
    for log in logs:
        table.add_row(
            log.status,
            log.scheduled_at.strftime("%Y-%m-%d %H:%M:%S") if log.scheduled_at else "N/A",
            log.linkedin_post_id or "N/A"
        )
        
    console.print(table)

def main():
    parser = argparse.ArgumentParser(description="LinkedIn Impression Booster CLI")
    parser.add_argument("command", choices=["run", "analyse", "status"], help="Command to execute")
    
    args = parser.parse_args()
    
    if args.command == "run":
        run_content_cycle()
    elif args.command == "analyse":
        run_analysis_cycle()
    elif args.command == "status":
        print_status()

if __name__ == "__main__":
    main()
