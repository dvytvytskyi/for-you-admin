'use client'

import React, { useState } from 'react';
import { Card, Table, Tabs, Tag, Typography, Space, Input, Badge, Descriptions, Spin, Alert } from 'antd';
import { ApiOutlined, DatabaseOutlined, DashboardOutlined, SearchOutlined } from '@ant-design/icons';
import useSWR from 'swr';
import { api } from '@/lib/api';

const { Title, Text } = Typography;

const fetcher = (url: string) => api.get(url).then(res => res.data);

const SystemOverviewPage = () => {
    const { data, error, isLoading } = useSWR('/system/info', fetcher, { 
        refreshInterval: 30000 // Refresh every 30 seconds
    });
    const [searchText, setSearchText] = useState('');

    if (error) return (
        <div style={{ padding: 24 }}>
            <Alert message="Error fetching system data" description={error.message} type="error" showIcon />
        </div>
    );

    if (isLoading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <Spin size="large" tip="Loading system architecture..." />
        </div>
    );

    const { tables = [], routes = [], system = {} } = data?.data || {};

    // Filter logic
    const filteredRoutes = routes.filter((r: any) => 
        r.path.toLowerCase().includes(searchText.toLowerCase()) ||
        r.methods.some((m: string) => m.toLowerCase().includes(searchText.toLowerCase()))
    );

    const filteredTables = tables.filter((t: any) => 
        t.name.toLowerCase().includes(searchText.toLowerCase()) ||
        t.tableName.toLowerCase().includes(searchText.toLowerCase())
    );

    const routeColumns = [
        {
            title: 'Method',
            dataIndex: 'methods',
            key: 'methods',
            render: (methods: string[]) => (
                <Space>
                    {methods.map(m => (
                        <Tag color={m === 'GET' ? 'green' : m === 'POST' ? 'blue' : m === 'DELETE' ? 'red' : 'orange'} key={m}>
                            {m}
                        </Tag>
                    ))}
                </Space>
            )
        },
        {
            title: 'Path',
            dataIndex: 'path',
            key: 'path',
            render: (path: string) => <Text code>{path}</Text>,
            sorter: (a: any, b: any) => a.path.localeCompare(b.path)
        },
        {
            title: 'Namespace',
            key: 'namespace',
            render: (_: any, record: any) => {
                const parts = record.path.split('/');
                const namespace = parts.length > 2 ? parts[2] : 'root';
                return <Tag>{namespace}</Tag>;
            }
        }
    ];

    const tableColumns = [
        {
            title: 'Entity Name',
            dataIndex: 'name',
            key: 'name',
            render: (name: string) => <Text strong>{name}</Text>,
            sorter: (a: any, b: any) => a.name.localeCompare(b.name)
        },
        {
            title: 'DB Table',
            dataIndex: 'tableName',
            key: 'tableName',
            render: (tableName: string) => <Tag icon={<DatabaseOutlined />}>{tableName}</Tag>,
            sorter: (a: any, b: any) => a.tableName.localeCompare(b.tableName)
        },
        {
            title: 'Columns Count',
            key: 'columns',
            render: (record: any) => <Badge count={record.columns?.length} color="#52c41a" showZero />,
        },
        {
            title: 'Fields',
            key: 'fields',
            render: (record: any) => (
                <Text type="secondary" ellipsis={{ tooltip: record.columns.map((c: any) => c.name).join(', ') }}>
                    {record.columns.slice(0, 5).map((c: any) => c.name).join(', ')}
                    {record.columns.length > 5 ? '...' : ''}
                </Text>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <Title level={2}>
                        <DashboardOutlined /> System Architecture
                    </Title>
                    <Text type="secondary">Real-time overview of the registered API endpoints and database schema.</Text>
                </div>
                <Input 
                    placeholder="Search routes or tables..." 
                    prefix={<SearchOutlined />} 
                    style={{ width: 300 }}
                    onChange={e => setSearchText(e.target.value)}
                />
            </div>

            <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Card title="Module Statistics" bordered={false} className="shadow-sm">
                    <div style={{ display: 'flex', gap: 48 }}>
                        <Badge count={routes.length} overflowCount={999} title="Total Routes">
                            <Card.Grid style={{ width: 'auto', textAlign: 'center', padding: '12px 24px' }}>
                                <ApiOutlined style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
                                <Text strong>API Routes</Text>
                            </Card.Grid>
                        </Badge>
                        <Badge count={tables.length} overflowCount={999} color="#52c41a">
                            <Card.Grid style={{ width: 'auto', textAlign: 'center', padding: '12px 24px' }}>
                                <DatabaseOutlined style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
                                <Text strong>DB Tables</Text>
                            </Card.Grid>
                        </Badge>
                        <Card.Grid style={{ width: 'auto', textAlign: 'center', padding: '12px 24px' }}>
                           <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Uptime</Text>
                           <Text strong>{Math.floor(system.uptime / 3600)}h {Math.floor((system.uptime % 3600) / 60)}m</Text>
                        </Card.Grid>
                    </div>
                </Card>

                <Tabs 
                    defaultActiveKey="routes"
                    type="card"
                    items={[
                        {
                            label: (<span><ApiOutlined /> Registered Endpoints</span>),
                            key: 'routes',
                            children: (
                                <Table 
                                    dataSource={filteredRoutes} 
                                    columns={routeColumns} 
                                    pagination={{ pageSize: 15 }}
                                    rowKey={(record) => `${record.methods.join('-')}-${record.path}`}
                                />
                            )
                        },
                        {
                            label: (<span><DatabaseOutlined /> Database Schema</span>),
                            key: 'tables',
                            children: (
                                <Table 
                                    dataSource={filteredTables} 
                                    columns={tableColumns} 
                                    pagination={{ pageSize: 15 }}
                                    rowKey="name"
                                    expandable={{
                                        expandedRowRender: (record) => (
                                            <Table
                                                size="small"
                                                pagination={false}
                                                dataSource={record.columns}
                                                columns={[
                                                    { title: 'Property', dataIndex: 'name', key: 'name' },
                                                    { title: 'Type', dataIndex: 'type', key: 'type', render: (t) => <Tag color="orange">{t}</Tag> },
                                                    { title: 'Nullable', dataIndex: 'isNullable', key: 'isNullable', render: (val) => val ? '✅' : '❌' },
                                                ]}
                                                rowKey="name"
                                            />
                                        ),
                                    }}
                                />
                            )
                        }
                    ]}
                />
            </Space>
        </div>
    );
};

export default SystemOverviewPage;
