var fs = require('fs');

// Constants

var con =
{
	allowable_connections:
	[
		['dialogue.Text', 'dialogue.Text'],
		['dialogue.Text', 'dialogue.Node'],
		['dialogue.Text', 'dialogue.Choice'],
		['dialogue.Text', 'dialogue.Set'],
		['dialogue.Text', 'dialogue.Branch'],
		['dialogue.Node', 'dialogue.Text'],
		['dialogue.Node', 'dialogue.Node'],
		['dialogue.Node', 'dialogue.Choice'],
		['dialogue.Node', 'dialogue.Set'],
		['dialogue.Node', 'dialogue.Branch'],
		['dialogue.Choice', 'dialogue.Text'],
		['dialogue.Choice', 'dialogue.Node'],
		['dialogue.Choice', 'dialogue.Set'],
		['dialogue.Choice', 'dialogue.Branch'],
		['dialogue.Set', 'dialogue.Text'],
		['dialogue.Set', 'dialogue.Node'],
		['dialogue.Set', 'dialogue.Set'],
		['dialogue.Set', 'dialogue.Branch'],
		['dialogue.Branch', 'dialogue.Text'],
		['dialogue.Branch', 'dialogue.Node'],
		['dialogue.Branch', 'dialogue.Set'],
		['dialogue.Branch', 'dialogue.Branch'],
	],

	default_link: new joint.dia.Link(
	{
		attrs:
		{
			'.marker-target': { d: 'M 10 0 L 0 5 L 10 10 z', },
			'.link-tools .tool-remove circle, .marker-vertex': { r: 8 },
		},
	}),
};
con.default_link.set('smooth', true);

// State

var state =
{
	graph: new joint.dia.Graph(),
	paper: null,
	filepath: null,
	panning: false,
	mouse_position: { x: 0, y: 0 },
	context_position: { x: 0, y: 0 },
	menu: null,
};

// Models

joint.shapes.dialogue = {};
joint.shapes.dialogue.Base = joint.shapes.devs.Model.extend(
{
	defaults: joint.util.deepSupplement
	(
		{
			type: 'dialogue.Base',
			size: { width: 200, height: 64 },
			name: '',
			attrs:
			{
				rect: { stroke: 'none', 'fill-opacity': 0 },
				text: { display: 'none' },
			},
		},
		joint.shapes.devs.Model.prototype.defaults
	),
});

joint.shapes.dialogue.BaseView = joint.shapes.devs.ModelView.extend(
{
	template:
	[
		'<div class="node">',
		'<span class="label"></span>',
		'<button class="delete">x</button>',
		'<input type="text" class="name" placeholder="ID" />',
		'</div>',
	].join(''),

	initialize: function()
	{
		_.bindAll(this, 'updateBox');
		joint.shapes.devs.ModelView.prototype.initialize.apply(this, arguments);

		this.$box = $(_.template(this.template)());
		// Prevent paper from handling pointerdown.
		this.$box.find('input').on('mousedown click', function(evt) { evt.stopPropagation(); });

		// This is an example of reacting on the input change and storing the input data in the cell model.
		this.$box.find('input.name').on('change', _.bind(function(evt)
		{
			this.model.set('name', $(evt.target).val());
		}, this));

		this.$box.find('.delete').on('click', _.bind(this.model.remove, this.model));
		// Update the box position whenever the underlying model changes.
		this.model.on('change', this.updateBox, this);
		// Remove the box when the model gets removed from the graph.
		this.model.on('remove', this.removeBox, this);

		this.updateBox();
	},

	render: function()
	{
		joint.shapes.devs.ModelView.prototype.render.apply(this, arguments);
		this.paper.$el.prepend(this.$box);
		this.updateBox();
		return this;
	},

	updateBox: function()
	{
		// Set the position and dimension of the box so that it covers the JointJS element.
		var bbox = this.model.getBBox();
		// Example of updating the HTML with a data stored in the cell model.
		var nameField = this.$box.find('input.name');
		if (!nameField.is(':focus'))
			nameField.val(this.model.get('name'));
		var label = this.$box.find('.label');
		var type = this.model.get('type').slice('dialogue.'.length);
		label.text(type);
		label.attr('class', 'label ' + type);
		this.$box.css({ width: bbox.width, height: bbox.height, left: bbox.x, top: bbox.y, transform: 'rotate(' + (this.model.get('angle') || 0) + 'deg)' });
	},

	removeBox: function(evt)
	{
		this.$box.remove();
	},
});

joint.shapes.dialogue.Node = joint.shapes.devs.Model.extend(
{
	defaults: joint.util.deepSupplement
	(
		{
			type: 'dialogue.Node',
			inPorts: ['input'],
			outPorts: ['output'],
			attrs:
			{
				'.outPorts circle': { unlimitedConnections: ['dialogue.Choice'], }
			},
		},
		joint.shapes.dialogue.Base.prototype.defaults
	),
});
joint.shapes.dialogue.NodeView = joint.shapes.dialogue.BaseView;

joint.shapes.dialogue.Text = joint.shapes.devs.Model.extend(
{
	defaults: joint.util.deepSupplement
	(
		{
			type: 'dialogue.Text',
			inPorts: ['input'],
			outPorts: ['output'],
			size: { width: 200, height: 100, },
			attrs:
			{
				'.outPorts circle': { unlimitedConnections: ['dialogue.Choice'], }
			},
		},
		joint.shapes.dialogue.Base.prototype.defaults
	),
});
joint.shapes.dialogue.TextView = joint.shapes.dialogue.BaseView.extend(
{
	template:
	[
		'<div class="node">',
		'<span class="label"></span>',
		'<button class="delete">x</button>',
		'<input type="text" class="name" placeholder="Text" />',
		'<select name="face">',
		'<option>Default</option>',
		'<option>Sad</option>',
		'<option>Upbeat</option>',
		'<option>Urgent</option>',
		'<option>EyesClosed</option>',
		'<option>Smile</option>',
		'<option>Wat</option>',
		'<option>Unamused</option>',
		'<option>Angry</option>',
		'<option>Concerned</option>',
		'<option>EyeRoll</option>',
		'<option>Shifty</option>',
		'<option>Sarcastic</option>',
		'<option>Evil</option>',
		'<option>TongueOut</option>',
		'</select>',
		'</div>',
	].join(''),

	initialize: function()
	{
		joint.shapes.dialogue.BaseView.prototype.initialize.apply(this, arguments);
		var $select = this.$box.find('select');
		$select.on('change', _.bind(function(evt)
		{
			this.model.set('face', $(evt.target).val());
		}, this));
		$select.on('mousedown click', function(evt) { evt.stopPropagation(); });
	},

	updateBox: function()
	{
		joint.shapes.dialogue.BaseView.prototype.updateBox.apply(this, arguments);
		var $field = this.$box.find('select');
		if (!$field.is(':focus'))
		{
			var face = this.model.get('face');
			if (face)
				$field.val(face);
			else
				$field.val('Default');
		}
	},
});

joint.shapes.dialogue.Choice = joint.shapes.devs.Model.extend(
{
	defaults: joint.util.deepSupplement
	(
		{
			type: 'dialogue.Choice',
			inPorts: ['input'],
			outPorts: ['output'],
		},
		joint.shapes.dialogue.Base.prototype.defaults
	),
});
joint.shapes.dialogue.ChoiceView = joint.shapes.dialogue.BaseView;

joint.shapes.dialogue.Branch = joint.shapes.devs.Model.extend(
{
	defaults: joint.util.deepSupplement
	(
		{
			type: 'dialogue.Branch',
			size: { width: 200, height: 100, },
			inPorts: ['input'],
			outPorts: ['output0'],
			values: [],
		},
		joint.shapes.dialogue.Base.prototype.defaults
	),
});
joint.shapes.dialogue.BranchView = joint.shapes.dialogue.BaseView.extend(
{
	template:
	[
		'<div class="node">',
		'<span class="label"></span>',
		'<button class="delete">x</button>',
		'<button class="add">+</button>',
		'<button class="remove">-</button>',
		'<input type="text" class="name" placeholder="Variable" />',
		'<input type="text" value="Default" readonly/>',
		'</div>',
	].join(''),

	initialize: function()
	{
		joint.shapes.dialogue.BaseView.prototype.initialize.apply(this, arguments);
		this.$box.find('.add').on('click', _.bind(this.addPort, this));
		this.$box.find('.remove').on('click', _.bind(this.removePort, this));
	},

	removePort: function()
	{
		if (this.model.get('outPorts').length > 1)
		{
			var outPorts = this.model.get('outPorts').slice(0);
			outPorts.pop();
			this.model.set('outPorts', outPorts);
			var values = this.model.get('values').slice(0);
			values.pop();
			this.model.set('values', values);
			this.updateSize();
		}
	},

	addPort: function()
	{
		var outPorts = this.model.get('outPorts').slice(0);
		outPorts.push('output' + outPorts.length.toString());
		this.model.set('outPorts', outPorts);
		var values = this.model.get('values').slice(0);
		values.push(null);
		this.model.set('values', values);
		this.updateSize();
	},

	updateBox: function()
	{
		joint.shapes.dialogue.BaseView.prototype.updateBox.apply(this, arguments);
		var values = this.model.get('values');
		var valueFields = this.$box.find('input.value');

		// Add value fields if necessary
		for (var i = valueFields.length; i < values.length; i++)
		{
			// Prevent paper from handling pointerdown.
			var $field = $('<input type="text" class="value" />');
			$field.attr('placeholder', 'Value ' + (i + 1).toString());
			$field.attr('index', i);
			this.$box.append($field);
			$field.on('mousedown click', function(evt) { evt.stopPropagation(); });

			// This is an example of reacting on the input change and storing the input data in the cell model.
			$field.on('change', _.bind(function(evt)
			{
				var values = this.model.get('values').slice(0);
				values[$(evt.target).attr('index')] = $(evt.target).val();
				this.model.set('values', values);
			}, this));
		}

		// Remove value fields if necessary
		for (var i = values.length; i < valueFields.length; i++)
			$(valueFields[i]).remove();

		// Update value fields
		valueFields = this.$box.find('input.value');
		for (var i = 0; i < valueFields.length; i++)
		{
			var field = $(valueFields[i]);
			if (!field.is(':focus'))
				field.val(values[i]);
		}
	},

	updateSize: function()
	{
		var textField = this.$box.find('input.name');
		var height = textField.outerHeight(true);
		this.model.set('size', { width: 200, height: 100 + Math.max(0, (this.model.get('outPorts').length - 1) * height) });
	},
});

joint.shapes.dialogue.Set = joint.shapes.devs.Model.extend(
{
	defaults: joint.util.deepSupplement
	(
		{
			type: 'dialogue.Set',
			inPorts: ['input'],
			outPorts: ['output'],
			size: { width: 200, height: 100, },
			value: '',
		},
		joint.shapes.dialogue.Base.prototype.defaults
	),
});

joint.shapes.dialogue.SetView = joint.shapes.dialogue.BaseView.extend(
{
	template:
	[
		'<div class="node">',
		'<span class="label"></span>',
		'<button class="delete">x</button>',
		'<input type="text" class="name" placeholder="Variable" />',
		'<input type="text" class="value" placeholder="Value" />',
		'</div>',
	].join(''),

	initialize: function()
	{
		joint.shapes.dialogue.BaseView.prototype.initialize.apply(this, arguments);
		this.$box.find('input.value').on('change', _.bind(function(evt)
		{
			this.model.set('value', $(evt.target).val());
		}, this));
	},

	updateBox: function()
	{
		joint.shapes.dialogue.BaseView.prototype.updateBox.apply(this, arguments);
		var field = this.$box.find('input.value');
		if (!field.is(':focus'))
			field.val(this.model.get('value'));
	},
});

// Functions

var func = {};

func.validate_connection = function(cellViewS, magnetS, cellViewT, magnetT, end, linkView)
{
	// Prevent loop linking
	if (magnetS === magnetT)
		return false;

	if (cellViewS === cellViewT)
		return false;

	if ($(magnetT).parents('.outPorts').length > 0) // Can't connect to an output port
		return false;

	var sourceType = cellViewS.model.attributes.type;
	var targetType = cellViewT.model.attributes.type;
	var valid = false;
	for (var i = 0; i < con.allowable_connections.length; i++)
	{
		var rule = con.allowable_connections[i];
		if (sourceType === rule[0] && targetType === rule[1])
		{
			valid = true;
			break;
		}
	}
	if (!valid)
		return false;

	var links = state.graph.getConnectedLinks(cellViewS.model);
	for (var i = 0; i < links.length; i++)
	{
		var link = links[i];
		if (link.attributes.source.id === cellViewS.model.id && link.attributes.source.port === magnetS.attributes.port.nodeValue && link.attributes.target.id)
		{
			var targetCell = state.graph.getCell(link.attributes.target.id);
			if (targetCell.attributes.type !== targetType)
				return false; // We can only connect to multiple targets of the same type
			if (targetCell === cellViewT.model)
				return false; // Already connected
		} 
	}

	return true;
};

func.validate_magnet = function(cellView, magnet)
{
	if ($(magnet).parents('.outPorts').length === 0)
		return false; // we only want output ports

	// If unlimited connections attribute is null, we can only ever connect to one object
	// If it is not null, it is an array of type strings which are allowed to have unlimited connections
	var unlimitedConnections = magnet.getAttribute('unlimitedConnections');
	var links = state.graph.getConnectedLinks(cellView.model);
	for (var i = 0; i < links.length; i++)
	{
		var link = links[i];
		if (link.attributes.source.id === cellView.model.id && link.attributes.source.port === magnet.attributes.port.nodeValue)
		{
			// This port already has a connection
			if (unlimitedConnections && link.attributes.target.id)
			{
				var targetCell = state.graph.getCell(link.attributes.target.id);
				if (unlimitedConnections.indexOf(targetCell.attributes.type) !== -1)
					return true; // It's okay because this target type has unlimited connections
			} 
			return false;
		}
	}

	return true;
};

func.optimized_data = function()
{
	var cells = state.graph.toJSON().cells;
	var nodesByID = {};
	var cellsByID = {};
	var nodes = [];
	for (var i = 0; i < cells.length; i++)
	{
		var cell = cells[i];
		if (cell.type != 'link')
		{
			var node =
			{
				type: cell.type.slice('dialogue.'.length),
				id: cell.id,
			};
			if (node.type === 'Branch')
			{
				node.variable = cell.name;
				node.branches = {};
				for (var j = 0; j < cell.values.length; j++)
				{
					var branch = cell.values[j];
					node.branches[branch] = null;
				}
			}
			else if (node.type === 'Set')
			{
				node.variable = cell.name;
				node.value = cell.value;
				node.next = null;
			}
			else if (node.type === 'Text')
			{
				node.name = cell.name;
				node.face = cell.face;
				node.next = null;
			}
			else
			{
				node.name = cell.name;
				node.next = null;
			}
			nodes.push(node);
			nodesByID[cell.id] = node;
			cellsByID[cell.id] = cell;
		}
	}
	for (var i = 0; i < cells.length; i++)
	{
		var cell = cells[i];
		if (cell.type === 'link')
		{
			var source = nodesByID[cell.source.id];
			var target = cell.target ? nodesByID[cell.target.id] : null;
			if (source)
			{
				if (source.type === 'Branch')
				{
					var portNumber = parseInt(cell.source.port.slice('output'.length));
					var value;
					if (portNumber === 0)
						value = '_default';
					else
					{
						var sourceCell = cellsByID[source.id];
						value = sourceCell.values[portNumber - 1];
					}
					source.branches[value] = target ? target.id : null;
				}
				else if ((source.type === 'Text' || source.type === 'Node') && target && target.type === 'Choice')
				{
					if (!source.choices)
					{
						source.choices = [];
						delete source.next;
					}
					source.choices.push(target.id);
				}
				else
					source.next = target ? target.id : null;
			}
		}
	}
	return nodes;
};

// Menu actions

func.flash = function(text)
{
	var $flash = $('#flash');
	$flash.text(text);
	$flash.stop(true, true);
	$flash.show();
	$flash.css('opacity', 1.0);
	$flash.fadeOut({ duration: 1500 });
};

func.apply_fields = function()
{
	$('input[type=text], select').blur();
};

func.save = function()
{
	func.apply_fields();

	if (!state.filepath)
		func.show_save_dialog();
	else
		func.do_save();
};

func.optimized_filename = function(f)
{
	return f.substring(0, f.length - 2) + 'dlz';
};

func.do_save = function()
{
	if (state.filepath)
	{
		fs.writeFileSync(state.filepath, JSON.stringify(state.graph), 'utf8');
		fs.writeFileSync(func.optimized_filename(state.filepath), JSON.stringify(func.optimized_data()), 'utf8');
		func.flash('Saved ' + state.filepath);
	}
};

func.filename_from_filepath = function(f)
{
	return f.replace(/^.*[\\\/]/, '');
};

func.show_open_dialog = function()
{
	$('#file_open').click();
};

func.show_save_dialog = function()
{
	$('#file_save').click();
};

func.add_node = function(constructor)
{
	return function()
	{
		var container = $('#container')[0];
		var element = new constructor(
		{
			position: { x: state.context_position.x + container.scrollLeft, y: state.context_position.y + container.scrollTop },
		});
		state.graph.addCells([element]);
	};
};

func.clear = function()
{
	state.graph.clear();
	state.filepath = null;
	document.title = 'Dialogger';
};

func.handle_open_files = function(files)
{
	state.filepath = files[0].path;
	var data = fs.readFileSync(state.filepath);
	document.title = func.filename_from_filepath(state.filepath);
	state.graph.clear();
	state.graph.fromJSON(JSON.parse(data));
};

func.handle_save_files = function(files)
{
	state.filepath = files[0].path;
	func.do_save();
};

// Initialize

(function()
{
	state.paper = new joint.dia.Paper(
	{
		el: $('#paper'),
		width: 16000,
		height: 8000,
		model: state.graph,
		gridSize: 1,
		defaultLink: con.default_link,
		validateConnection: func.validate_connection,
		validateMagnet: func.validate_magnet,
		snapLinks: { radius: 75 }, // enable link snapping within 75px lookup radius
		markAvailable: true,
	});

	state.paper.on('blank:pointerdown', function(e, x, y)
	{
		if (e.button === 0 || e.button === 1)
		{
			state.panning = true;
			state.mouse_position.x = e.pageX;
			state.mouse_position.y = e.pageY;
			$('body').css('cursor', 'move');
			func.apply_fields();
		}
	});
	state.paper.on('cell:pointerdown', function(e, x, y)
	{
		func.apply_fields();
	});

	$('#container').mousemove(function(e)
	{
		if (state.panning)
		{
			var $this = $(this);
			$this.scrollLeft($this.scrollLeft() + state.mouse_position.x - e.pageX);
			$this.scrollTop($this.scrollTop() + state.mouse_position.y - e.pageY);
			state.mouse_position.x = e.pageX;
			state.mouse_position.y = e.pageY;
		}
	});

	$('#container').mouseup(function(e)
	{
		state.panning = false;
		$('body').css('cursor', 'default');
	});

	$('#file_open').on('change', function()
	{
		if (this.files)
			func.handle_open_files(this.files);
		// clear files from this input
		var $this = $(this);
		$this.wrap('<form>').parent('form').trigger('reset');
		$this.unwrap();
	});

	$('#file_save').on('change', function()
	{
		func.handle_save_files(this.files);
	});

	$('body').on('dragenter', function(e)
	{
		e.stopPropagation();
		e.preventDefault();
	});

	$('body').on('dragexit', function(e)
	{
		e.stopPropagation();
		e.preventDefault();
	});

	$('body').on('dragover', function(e)
	{
		e.stopPropagation();
		e.preventDefault();
	});

	$('body').on('drop', function(e)
	{
		e.stopPropagation();
		e.preventDefault();
		func.handle_open_files(e.originalEvent.dataTransfer.files);
	});

	$(window).on('keydown', function(event)
	{
		// Catch Ctrl-S or key code 19 on Mac (Cmd-S)
		if (((event.ctrlKey || event.metaKey) && String.fromCharCode(event.which).toLowerCase() === 's') || event.which === 19)
		{
			event.stopPropagation();
			event.preventDefault();
			func.save();
			return false;
		}
		else if ((event.ctrlKey || event.metaKey) && String.fromCharCode(event.which).toLowerCase() === 'o')
		{
			event.stopPropagation();
			event.preventDefault();
			func.show_open_dialog();
			return false;
		}
		return true;
	});

	$(window).resize(function()
	{
		func.apply_fields();
		var $window = $(window);
		var $container = $('#container');
		$container.height($window.innerHeight());
		$container.width($window.innerWidth());
		return this;
	});

	$(window).trigger('resize');

	// Context menu

	state.menu = new nw.Menu();
	state.menu.append(new nw.MenuItem({ label: 'Text', click: func.add_node(joint.shapes.dialogue.Text) }));
	state.menu.append(new nw.MenuItem({ label: 'Choice', click: func.add_node(joint.shapes.dialogue.Choice) }));
	state.menu.append(new nw.MenuItem({ label: 'Branch', click: func.add_node(joint.shapes.dialogue.Branch) }));
	state.menu.append(new nw.MenuItem({ label: 'Set', click: func.add_node(joint.shapes.dialogue.Set) }));
	state.menu.append(new nw.MenuItem({ label: 'Node', click: func.add_node(joint.shapes.dialogue.Node) }));
	state.menu.append(new nw.MenuItem({ type: 'separator' }));
	state.menu.append(new nw.MenuItem({ label: 'Save', click: func.save }));
	state.menu.append(new nw.MenuItem({ label: 'Open', click: func.show_open_dialog }));
	state.menu.append(new nw.MenuItem({ label: 'New', click: func.clear }));

	document.body.addEventListener('contextmenu', function(e)
	{
		e.preventDefault();
		state.context_position.x = e.x;
		state.context_position.y = e.y;
		state.menu.popup(e.x, e.y);
		return false;
	}, false);
})();
