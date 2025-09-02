import * as React from "react";
import {
    AudioWaveform,
    BookOpen,
    Bot,
    Command,
    Frame,
    GalleryVerticalEnd,
    Map,
    PieChart,
    Settings2,
    SquareTerminal,
} from "lucide-react";
import { NavMain } from "@/components/common/nav-main";
import { NavProjects } from "@/components/common/nav-projects";
import { NavUser } from "@/components/common/nav-user";
import { TeamSwitcher } from "@/components/common/team-switcher";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth/auth.helper";
// This is sample data.
const data = {
    user: {
        name: "testing",
        email: "testing@example.com",
        avatar: "/avatars/lewan.jpg",
    },
    teams: [
        {
            name: "Acme Inc",
            logo: GalleryVerticalEnd,
            plan: "Enterprise",
        },
        {
            name: "Acme Corp.",
            logo: AudioWaveform,
            plan: "Startup",
        },
        {
            name: "Evil Corp.",
            logo: Command,
            plan: "Free",
        },
    ],
    navMain: [
        {
            title: "Playground",
            url: "#",
            icon: SquareTerminal,
            isActive: true,
            items: [
                {
                    title: "History",
                    url: "#",
                },
                {
                    title: "Starred",
                    url: "#",
                },
                {
                    title: "Settings",
                    url: "#",
                },
            ],
        },
        {
            title: "Models",
            url: "#",
            icon: Bot,
            items: [
                {
                    title: "Genesis",
                    url: "#",
                },
                {
                    title: "Explorer",
                    url: "#",
                },
                {
                    title: "Quantum",
                    url: "#",
                },
            ],
        },
        {
            title: "Documentation",
            url: "#",
            icon: BookOpen,
            items: [
                {
                    title: "Introduction",
                    url: "#",
                },
                {
                    title: "Get Started",
                    url: "#",
                },
                {
                    title: "Tutorials",
                    url: "#",
                },
                {
                    title: "Changelog",
                    url: "#",
                },
            ],
        },
        {
            title: "Settings",
            url: "#",
            icon: Settings2,
            items: [
                {
                    title: "General",
                    url: "#",
                },
                {
                    title: "Team",
                    url: "#",
                },
                {
                    title: "Billing",
                    url: "#",
                },
                {
                    title: "Limits",
                    url: "#",
                },
            ],
        },
    ],
    projects: [
        {
            name: "Home",
            url: "/", // route về trang Home
            icon: Frame,
        },
        {
            name: "Backtest",
            url: "/backtest", // route về trang Backtest
            icon: PieChart,
        },
        {
            name: "Prediction",
            url: "/prediction", // route về trang Prediction (sẽ tạo sau)
            icon: Map,
        },
    ],
};
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { user } = useAuth();

    const navUser = {
        name: user?.username,
        email: user?.email,
        avatar: "/avatars/lewan.jpg",
    } as {
        name: string;
        email: string;
        avatar: string;
    };

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher teams={data.teams} />
            </SidebarHeader>
            <SidebarContent>
                {/* <NavMain items={data.navMain} /> */}
                <NavProjects projects={data.projects} />
            </SidebarContent>
            <SidebarFooter id="footer">
                <NavUser user={navUser} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
